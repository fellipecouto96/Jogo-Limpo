import { MainLayout } from './components/layout';

function App() {
  return (
    <MainLayout>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Bem-vindo ao Jogo Limpo
        </h2>
        <p className="text-gray-600">
          A infraestrutura oficial da sinuca amadora.
        </p>
      </div>
    </MainLayout>
  );
}

export default App;
