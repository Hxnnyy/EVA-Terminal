export default function LoadingArticle() {
  return (
    <article className="writing-article articles-reader articles-loading">
      <div className="articles-loading__hero" aria-hidden="true">
        <div className="articles-loading__eyebrow" />
        <div className="articles-loading__line" />
        <div className="articles-loading__line short" />
      </div>
      <div className="articles-loading__body" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="articles-loading__paragraph" />
        ))}
      </div>
    </article>
  );
}
