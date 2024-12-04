import React from "react";

export function ListFruits({ fruits }: { fruits: string[] }) {
  return (
    <div>
      <h2>Fruits</h2>
      <ul>
        {fruits.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
