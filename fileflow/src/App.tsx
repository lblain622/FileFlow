import * as React from "react";
import { useState } from "react";
import { Button } from "primereact/button";

function App() {
  

  

  return (
    <main className="container">
    
          <div style={{ padding: "2rem" }}>
              <h1>FileFlow</h1>

              <Button
                  label="Select Folder"
                  icon="pi pi-folder-open"
              />
          </div>
    </main>
  );
}

export default App;
