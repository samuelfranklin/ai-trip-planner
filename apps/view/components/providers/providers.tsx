'use client';

import type { ReactNode } from 'react';
import { ChatProvider } from './chat-provider';
import { ChatProviderSDK } from './chat-provider-sdk';

interface ProvidersProps {
  children: ReactNode;
  useSdk?: boolean;
}

export function Providers({ children, useSdk = false }: ProvidersProps) {
  if (useSdk) {
    return <ChatProviderSDK>{children}</ChatProviderSDK>;
  }
  return <ChatProvider>{children}</ChatProvider>;
}