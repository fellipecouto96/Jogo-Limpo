export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">
        &#127921;
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Nenhum torneio encontrado
      </h2>
      <p className="text-gray-400 max-w-sm">
        Quando torneios forem criados, eles aparecerao aqui.
      </p>
    </div>
  );
}
