import { useEffect, useState } from 'react';

interface ProgressiveLoadingMessageProps {
  initialMessage?: string;
  className?: string;
}

const SECOND_STAGE_MS = 2000;
const THIRD_STAGE_MS = 5000;

export function ProgressiveLoadingMessage({
  initialMessage = 'Carregando informacoes',
  className = '',
}: ProgressiveLoadingMessageProps) {
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    const stageTwoTimer = setTimeout(() => {
      setMessage('Organizando os dados');
    }, SECOND_STAGE_MS);
    const stageThreeTimer = setTimeout(() => {
      setMessage('Pode levar alguns segundos');
    }, THIRD_STAGE_MS);

    return () => {
      clearTimeout(stageTwoTimer);
      clearTimeout(stageThreeTimer);
    };
  }, []);

  return (
    <p role="status" aria-live="polite" className={className}>
      {message}
    </p>
  );
}
