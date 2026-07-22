import dotenv from 'dotenv';
dotenv.config();

export const config = {
  github: {
    token: process.env.GITHUB_TOKEN || '',
  },
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  },
  thresholds: {
    stars24h: parseInt(process.env.STAR_THRESHOLD_24H || '1000', 10),
    stars72h: parseInt(process.env.STAR_THRESHOLD_72H || '3000', 10),
  },
};
