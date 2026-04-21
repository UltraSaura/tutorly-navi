import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description: string;
}

export const PageMeta = ({ title, description }: PageMetaProps) => (
  <Helmet>
    <title>{`${title} — Stuwy`}</title>
    <meta name="description" content={description} />
  </Helmet>
);

export default PageMeta;
