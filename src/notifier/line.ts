import { messagingApi } from '@line/bot-sdk';
import { config } from '../config';
import { Alert } from '../analyzer/velocity';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.line.channelAccessToken,
});

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toString();
}

function getExplosionLevel(delta: number): { emoji: string; label: string; color: string } {
  if (delta >= 5000) return { emoji: '💥', label: '超新星爆發', color: '#FF0000' };
  if (delta >= 3000) return { emoji: '🔥', label: '極速爆發', color: '#FF4500' };
  if (delta >= 1000) return { emoji: '⭐', label: '快速成長', color: '#FF8C00' };
  return { emoji: '📈', label: '穩定成長', color: '#32CD32' };
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: '#3178C6', JavaScript: '#F7DF1E', Python: '#3776AB',
    Rust: '#DEA584', Go: '#00ADD8', Java: '#B07219', 'C++': '#F34B7D',
    C: '#555555', 'C#': '#178600', Ruby: '#CC342D', Swift: '#F05138',
    Kotlin: '#A97BFF', Dart: '#00B4AB', PHP: '#4F5D95', Shell: '#89E051',
  };
  return colors[language] || '#586069';
}

function buildFlexMessage(alert: Alert): messagingApi.FlexBubble {
  const { repo, currentStars, delta, thresholdType } = alert;
  const level = getExplosionLevel(delta);

  const timeLabel = thresholdType === '24h' ? '24 小時' : '72 小時';
  const headerText = `${level.emoji} ${level.label}`;
  const deltaText = `+${formatNumber(delta)} ★ / ${timeLabel}`;

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: headerText,
              color: '#FFFFFF',
              size: 'sm',
              weight: 'bold',
              flex: 0,
            },
            {
              type: 'text',
              text: deltaText,
              color: '#FFFFFF',
              size: 'sm',
              align: 'end',
              flex: 0,
            },
          ],
        },
      ],
      backgroundColor: level.color,
      paddingAll: '12px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: repo.fullName,
          weight: 'bold',
          size: 'xl',
          wrap: true,
          color: '#1A1A1A',
        },
        {
          type: 'text',
          text: repo.description || '（無描述）',
          size: 'sm',
          color: '#666666',
          wrap: true,
          margin: 'md',
          maxLines: 3,
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '總星數',
                  size: 'xs',
                  color: '#999999',
                },
                {
                  type: 'text',
                  text: `★ ${formatNumber(currentStars)}`,
                  size: 'lg',
                  weight: 'bold',
                  color: '#1A1A1A',
                },
              ],
              flex: 1,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '爆發增量',
                  size: 'xs',
                  color: '#999999',
                },
                {
                  type: 'text',
                  text: `+${formatNumber(delta)}`,
                  size: 'lg',
                  weight: 'bold',
                  color: level.color,
                },
              ],
              flex: 1,
            },
            ...(repo.language ? [{
              type: 'box' as const,
              layout: 'vertical' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '語言',
                  size: 'xs' as const,
                  color: '#999999',
                },
                {
                  type: 'text' as const,
                  text: repo.language,
                  size: 'lg' as const,
                  weight: 'bold' as const,
                  color: getLanguageColor(repo.language),
                },
              ],
              flex: 1,
            }] : []),
          ],
        },
      ],
      paddingAll: '16px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '在 GitHub 上查看',
            uri: repo.url,
          },
          style: 'primary',
          color: '#24292E',
          height: 'sm',
        },
      ],
      paddingAll: '12px',
    },
  };
}

export async function broadcastAlerts(alerts: Alert[]): Promise<void> {
  if (alerts.length === 0) return;

  console.log(`[Notifier] Broadcasting ${alerts.length} alerts`);

  const flexMessages: messagingApi.FlexMessage[] = alerts.map(alert => ({
    type: 'flex',
    altText: `${getExplosionLevel(alert.delta).emoji} ${alert.repo.fullName} +${formatNumber(alert.delta)} stars in ${alert.hoursWindow}h`,
    contents: buildFlexMessage(alert),
  }));

  // LINE limits 5 messages per broadcast
  for (let i = 0; i < flexMessages.length; i += 5) {
    const batch = flexMessages.slice(i, i + 5);
    await client.broadcast({ messages: batch });
  }

  console.log('[Notifier] Broadcast complete');
}

export { client };
