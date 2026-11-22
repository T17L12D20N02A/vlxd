export type MiniSpec = {
  value: string;
  label: string;
};

export type Spec = {
  label: string;
  value: string;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  englishName: string;
  lead: string;
  miniSpecs: MiniSpec[];
  images: string[];
  description: string[];
  specs: Spec[];
  applications: string[];
  featured: boolean;
};

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  date: string;
  image: string;
  excerpt: string;
  blocks: Block[];
  relatedProducts: string[];
};

export type Application = {
  slug: string;
  title: string;
  image: string;
  excerpt: string;
  blocks: Block[];
  relatedProducts: string[];
};

export type JobFact = {
  value: string;
  label: string;
};

export type Job = {
  slug: string;
  title: string;
  department: string;
  facts: JobFact[];
  blocks: Block[];
};

export type Category = {
  slug: string;
  label: string;
  count: number;
};

export type Content = {
  products: Product[];
  articles: Article[];
  applications: Application[];
  jobs: Job[];
  categories: Category[];
};
