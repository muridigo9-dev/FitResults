// Available languages
export type Language = 'pt-BR' | 'en-US' | 'es-ES';

// Language metadata
export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

// Translation structure
export interface TranslationKeys {
  app: {
    name: string;
    version: string;
  };
  navigation: {
    dashboard: string;
    checkin: string;
    progress: string;
    health: string;
    nutrition: string;
    profile: string;
    diets: string;
    workouts: string;
    challenges: string;
    myDiets: string;
    myWorkouts: string;
    main: string;
    content: string;
    account: string;
  };
  actions: {
    save: string;
    cancel: string;
    continue: string;
    back: string;
    confirm: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    retry: string;
    start: string;
    complete: string;
    register: string;
    seeDetails: string;
    logout: string;
    exportData: string;
    clearTestData: string;
  };
  states: {
    loading: string;
    empty: string;
    error: string;
    success: string;
    saving: string;
    deleting: string;
    noResults: string;
    noConnection: string;
    serverUnavailable: string;
    notFound: string;
  };
  auth: {
    login: string;
    signup: string;
    email: string;
    password: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
    logout: string;
    logoutSuccess: string;
  };
  profile: {
    title: string;
    editProfile: string;
    myMetrics: string;
    notifications: string;
    appearance: string;
    privacy: string;
    helpSupport: string;
    language: string;
    selectLanguage: string;
    memberSince: string;
  };
  dashboard: {
    title: string;
    welcome: string;
    todaysSummary: string;
    weeklyProgress: string;
    recentActivity: string;
  };
  checkin: {
    title: string;
    dailyCheckin: string;
    completeCheckin: string;
    weight: string;
    water: string;
    meals: string;
    workoutsCompleted: string;
    mood: string;
    notes: string;
  };
  nutrition: {
    title: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
    macros: string;
    dailyGoal: string;
    consumed: string;
    remaining: string;
  };
  diets: {
    title: string;
    availableDiets: string;
    ingredients: string;
    preparation: string;
    nutritionalInfo: string;
    registerMeal: string;
    mealRegistered: string;
    todaysMeals: string;
    mealsToday: string;
    caloriesConsumed: string;
  };
  workouts: {
    title: string;
    availableWorkouts: string;
    exercises: string;
    duration: string;
    sets: string;
    reps: string;
    rest: string;
    markAsCompleted: string;
    workoutCompleted: string;
    todaysWorkouts: string;
    workoutsToday: string;
    minutesTraining: string;
    strength: string;
    cardio: string;
    functional: string;
    flexibility: string;
  };
  challenges: {
    title: string;
    availableChallenges: string;
    active: string;
    completed: string;
    notStarted: string;
    startChallenge: string;
    continueChallenge: string;
    days: string;
    daysCompleted: string;
    tasks: string;
    completeTask: string;
    taskCompleted: string;
    challengeProgress: string;
  };
  admin: {
    title: string;
    dashboard: string;
    users: string;
    content: string;
    habits: string;
    gamification: string;
    branding: string;
    settings: string;
    notifications: string;
    security: string;
    dataBackup: string;
    systemEmail: string;
    userContent: string;
    dietCreation: string;
    workoutCreation: string;
    allowDietCreation: string;
    allowWorkoutCreation: string;
    emailNewUsers: string;
    weeklyReport: string;
    pushNotifications: string;
    twoFactorAuth: string;
    sessionTimeout: string;
    minPasswordLength: string;
    autoBackup: string;
    dataRetention: string;
    saveAllSettings: string;
    settingsSaved: string;
  };
  time: {
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    minutes: string;
    hours: string;
    days: string;
  };
  units: {
    kg: string;
    lbs: string;
    ml: string;
    liters: string;
    kcal: string;
    grams: string;
  };
}

export type Translations = Record<Language, TranslationKeys>;
