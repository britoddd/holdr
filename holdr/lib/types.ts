export type Item = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  category: string;
  storagePlace: string;
  dateBought: string; // ISO date string
  dateOwned: string; // ISO date string - when they started owning it
  usageFrequency: "Daily" | "Weekly" | "Monthly" | "Rarely" | "Never";
  imageUrl?: string;
  createdAt: Date;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type StoragePlace = {
  id: string;
  name: string;
  color: string;
};
