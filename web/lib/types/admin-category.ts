/** Árbol de categorías para admin / formularios de producto. */
export type AdminSubcategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  categoryId: string;
};

export type AdminCategoryTree = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  subcategories: AdminSubcategoryRow[];
};
