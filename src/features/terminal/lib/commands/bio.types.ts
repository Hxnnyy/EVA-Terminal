export type BioFieldItem = {
  kind: 'field';
  label: string;
  value: string;
};

export type BioBulletItem = {
  kind: 'bullet';
  text: string;
};

export type BioSection = {
  title: string;
  items: Array<BioFieldItem | BioBulletItem>;
};

export type BioSnapshot = {
  sections: BioSection[];
  updatedAt: string | null;
  warnings: string[];
  rawBody: string | null;
};
