import { Button, Header, ProgressBar, Search } from '@carbon/react';

function App() {
  return (
    <div style={{ padding: 20 }}>
      <Button kind="primary">
        Teste Carbon
      </Button>
      <Button kind="tertiary">
        Teste Carbon
      </Button>
      <Search labelText="Search" placeholder="Search" onChange={(e) => console.log(e.target.value)} />
    </div>
  );
}

export default App;