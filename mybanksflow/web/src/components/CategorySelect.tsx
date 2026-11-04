import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  parent_category_id?: string | null;
  sort_order?: number;
}

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  filterType?: string;
  placeholder?: string;
  className?: string;
  includeAll?: boolean;
}

export function getSortedCategoriesWithSubs(categories: Category[], filterType?: string) {
  const filtered = filterType ? categories.filter((c) => c.type === filterType) : categories;
  const parents = filtered
    .filter((c) => !c.parent_category_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const children = filtered.filter((c) => c.parent_category_id);

  const result: Array<Category & { isChild?: boolean }> = [];
  parents.forEach((parent) => {
    result.push(parent);
    const subs = children
      .filter((c) => c.parent_category_id === parent.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    subs.forEach((sub) => result.push({ ...sub, isChild: true }));
  });

  // Also add children whose parent is not in the filtered set
  children.forEach((c) => {
    if (!result.find((r) => r.id === c.id)) {
      result.push({ ...c, isChild: true });
    }
  });

  return result;
}

export default function CategorySelect({
  categories,
  value,
  onValueChange,
  filterType,
  placeholder = "Categorie kiezen",
  className,
  includeAll = false,
}: CategorySelectProps) {
  const sorted = getSortedCategoriesWithSubs(categories, filterType);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Alle categorieën</SelectItem>}
        {sorted.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <div className="flex items-center gap-2">
              {(c as any).isChild && <span className="text-muted-foreground">└</span>}
              <div
                className={`rounded-full flex-shrink-0 ${(c as any).isChild ? "h-2 w-2" : "h-2.5 w-2.5"}`}
                style={{ background: `hsl(${c.color})` }}
              />
              <span className={(c as any).isChild ? "text-muted-foreground text-xs" : ""}>
                {c.name}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
