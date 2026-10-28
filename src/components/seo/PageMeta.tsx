import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://stuwy.lovable.app';

interface PageMetaProps {
  title: string;
  description: string;
}

export const PageMeta = ({ title, description }: PageMetaProps) => {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${pathname}`;
  const fullTitle = `${title} — Stuwy`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};

export default PageMeta;
