export interface AbyItQA {
  question: string;
  answer?: string;
}

export interface AbyItPlace {
  name: string;
  address: string;
  mapsUrl?: string;
}

export interface AbyItState {
  status: 'idle' | 'awaiting_answer' | 'completed';
  mode?: 'breakdown' | 'location';
  conversation: AbyItQA[];
  locationSuggestion?: {
    summary: string;
    places: AbyItPlace[];
  };
  generatedAt?: string;
}

export interface AbyItStep {
  _id?: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  order: number;
  source?: 'user' | 'aby';
}
