import { LoadingAssistText } from './loading/LoadingSystem.tsx';

interface ProgressiveLoadingMessageProps {
  initialMessage?: string;
  className?: string;
}

export function ProgressiveLoadingMessage({
  initialMessage = 'Carregando informacoes',
  className = '',
}: ProgressiveLoadingMessageProps) {
  return (
    <LoadingAssistText
      initialMessage={initialMessage}
      className={className}
    />
  );
}
