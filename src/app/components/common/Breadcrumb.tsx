import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          {item.href && !item.isCurrentPage ? (
            <Link href={item.href} className="hover:text-gray-800 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className={item.isCurrentPage ? "text-gray-900" : "text-gray-600"}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}