import { SearchHero } from "@/components/search-hero";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-content">
          <h1>
            Source products
            <br />
            with <span>HIOBuy</span>
          </h1>
          <p>
            A minimal Next.js storefront starter. Wire your Developer Portal API
            key, then try keyword, image, image-URL, and product-link search
            from one box — all through the public Product API.
          </p>
          <SearchHero />
        </div>
      </section>

      <section className="shell section home-features">
        <div className="section-head section-head-center">
          <div>
            <h2>What this demo covers</h2>
            <p>Mapped 1:1 to HIOBuy public endpoints.</p>
          </div>
        </div>
        <div className="feature-grid">
          <Feature
            title="Keyword search"
            endpoint="POST /v1/products/search"
            body="paginated cards from 1688 or Taobao."
          />
          <Feature
            title="Image search"
            endpoint="POST /v1/products/search-by-image"
            body="upload a photo or paste an image URL."
          />
          <Feature
            title="Product link"
            endpoint="POST /v1/products/parse"
            body="paste a 1688 / Taobao URL to open the listing."
          />
          <Feature
            title="Server-side key"
            endpoint="API routes proxy HIOBuy"
            body="so the Bearer token never ships to the browser."
          />
        </div>
      </section>
    </>
  );
}

function Feature({
  title,
  endpoint,
  body,
}: {
  title: string;
  endpoint: string;
  body: string;
}) {
  return (
    <div className="feature-card">
      <div className="feature-kicker">API</div>
      <h3>{title}</h3>
      <p className="feature-endpoint">{endpoint}</p>
      <p>{body}</p>
    </div>
  );
}
