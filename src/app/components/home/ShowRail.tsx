import { LibraryRow } from "@/utils/libraryRows";
import { ShowRailCard } from "./ShowRailCard";

interface ShowRailProps {
  row: LibraryRow;
}

export function ShowRail({ row }: ShowRailProps) {
  return (
    <section className="py-[6px] pb-[10px]">
      <div className="flex items-baseline gap-[10px] px-5 pb-4 md:px-10">
        <h2 className="text-[20px] font-extrabold tracking-[-0.01em]">{row.title}</h2>
        {row.note && (
          <span className="text-[12.5px]" style={{ color: "var(--faint)" }}>
            {row.note}
          </span>
        )}
      </div>
      <div className="cena-scroll flex gap-4 overflow-x-auto px-5 pb-[26px] pt-1 md:px-10">
        {row.shows.map((show) => (
          <ShowRailCard key={`${row.key}-${show.id}`} show={show} />
        ))}
      </div>
    </section>
  );
}
