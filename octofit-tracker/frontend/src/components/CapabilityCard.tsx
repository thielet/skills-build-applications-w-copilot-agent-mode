import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  loadItems: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({
  title,
  description,
  emptyMessage,
  loadItems,
  renderItem,
}: Props<T>) {
  const [items, setItems] = useState<T[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    loadItems()
      .then((results) => {
        if (active) setItems(results);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'An unexpected error occurred.');
        }
      });
    return () => {
      active = false;
    };
  }, [loadItems]);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {error ? (
          <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>
        ) : items === undefined ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : items.length === 0 ? (
          <p role="status">{emptyMessage}</p>
        ) : (
          <ul className="list-group" aria-label={title}>
            {items.map((item, index) => (
              <li className="list-group-item" key={index}>{renderItem(item)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
