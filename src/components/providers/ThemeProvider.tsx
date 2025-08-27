import React from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  // Este é apenas um wrapper simples para compatibilidade com código existente
  // No futuro, você pode adicionar lógica de contexto de tema aqui se necessário
  return <>{children}</>;
}
