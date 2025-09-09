// Tabs
export type RootTabParamList = {
  TrainingTab: undefined;
  RecordsTab: undefined;
  StatsTab: undefined;
  IceTab: undefined;
  ReadinessTab: undefined; // ← nové
  DebugDataScreen: undefined; // ← pre debugovanie
};

// Záznamy (Stack v tabu RecordsTab)
export type RecordsStackParamList = {
  Records: undefined;
  RecordsMonth: { month: string };
  RecordsWeek: { weekStart: string };

};

// Štatistiky (Stack v tabu StatsTab)
export type StatsStackParamList = {
  Stats: undefined;
  MonthStats: { month: string };
  WeeklyStats: { weekStart: string };
  Settings: undefined; // ⚡ nové
  YearStats: { year: string };     // YYYY
};

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  MonthlyGoalsEdit: undefined;
};

// Training stack (Feed + Add + Detail)
export type TrainingStackParamList = {
  TrainingsFeed: undefined;
  AddTraining: undefined;
  RecordDetail: { id: string; edit?: boolean };
  ReadinessLog: undefined; // ← nové
  MonthlyGoalsEdit: undefined;
};