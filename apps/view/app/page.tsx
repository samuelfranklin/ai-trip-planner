'use client';

import { ChatApp } from '@/components/chat-app';
import { ChatAppSDK } from '@/components/chat-app-sdk';

export default function Home() {
  // Use SDK version by default (can be controlled via env var in production)
  const useSdk = process.env.NEXT_PUBLIC_USE_SDK !== 'false';

  if (useSdk) {
    return <ChatAppSDK />;
  }

  return <ChatApp />;
}
