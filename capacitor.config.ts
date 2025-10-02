import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ad3cb23406524437b0fcf16e6930b813',
  appName: 'gym-companion-ai',
  webDir: 'dist',
  server: {
    url: 'https://ad3cb234-0652-4437-b0fc-f16e6930b813.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;