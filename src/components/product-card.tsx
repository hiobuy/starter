import Link from "next/link";
import {
  displayPrice,
  displayTitle,
  primaryImage,
  type ProductListItem,
} from "@/lib/types";

export function ProductCard({ item }: { item: ProductListItem }) {
  const href = `/product/${encodeURIComponent(item.channel)}/${encodeURIComponent(item.id)}`;
  const img = primaryImage(item);
  const price = displayPrice(item.price);

  return (
    <Link href={href} className="product-card">
      <div className="product-card-media">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={displayTitle(item.title)} loading="lazy" />
        ) : (
          <div className="skeleton" style={{ minHeight: "100%" }} />
        )}
      </div>
      <div className="product-card-body">
        <div className="product-card-channel">{item.channel}</div>
        <h3 className="product-card-title">{displayTitle(item.title)}</h3>
        <div className="product-card-price">{price ?? "—"}</div>
      </div>
    </Link>
  );
}
