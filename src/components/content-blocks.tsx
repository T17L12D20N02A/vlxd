import type { Block } from "@/lib/types";

export function ContentBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-page">
      {blocks.map((block, index) => {
        if (block.type === "h") {
          return <h2 key={index}>{block.text}</h2>;
        }
        if (block.type === "list") {
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
