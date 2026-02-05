
import { ClassLevel, SubjectConfig, CurriculumTopic } from './types';

// Subject Mapping with Arabic Names
export const SUBJECT_NAMES: Record<string, string> = {
  islamic_education: "التربية الإسلامية",
  arabic_language: "اللغة العربية",
  mathematics: "الرياضيات",
  civic_education: "التربية المدنية",
  art_education: "التربية الفنية",
  physical_education: "التربية البدنية",
  activities: "أنشطة",
  social_studies: "الاجتماعيات (تاريخ/جغرافيا)",
  natural_sciences: "العلوم الطبيعية",
  french_language: "اللغة الفرنسية",
};

// Subject Mapping with French Names for Official Report
export const SUBJECT_NAMES_FR: Record<string, string> = {
  islamic_education: "Education Islamique",
  arabic_language: "Langue arabe",
  mathematics: "Mathématiques",
  civic_education: "Education Civique",
  art_education: "Education Technique",
  physical_education: "Education Sportive",
  activities: "Activités",
  social_studies: "Histoire Géographie",
  natural_sciences: "Sciences Naturelles",
  french_language: "Français",
};

// Official Scoring Table (Points per Subject per Level) - Exact match to requirements
export const LEVEL_CONFIG: Record<ClassLevel, Record<string, number>> = {
  [ClassLevel.AF1]: { 
    islamic_education: 40, 
    arabic_language: 80, 
    mathematics: 40, 
    civic_education: 15, 
    art_education: 15, 
    physical_education: 10 
  },
  [ClassLevel.AF2]: { 
    islamic_education: 30, 
    arabic_language: 50, 
    mathematics: 40, 
    civic_education: 15, 
    art_education: 15, 
    french_language: 40,
    physical_education: 10, 
  },
  [ClassLevel.AF3]: { 
    islamic_education: 30, 
    arabic_language: 50, 
    mathematics: 40, 
    civic_education: 10, 
    art_education: 10, 
    french_language: 30,
    physical_education: 10, 
    social_studies: 10, 
    natural_sciences: 10,  
  },
  [ClassLevel.AF4]: { 
    islamic_education: 30, 
    arabic_language: 50, 
    mathematics: 40, 
    civic_education: 10, 
    art_education: 10, 
    french_language: 30,
    physical_education: 10, 
    social_studies: 10, 
    natural_sciences: 10, 
  },
  [ClassLevel.AF5]: { 
    islamic_education: 30, 
    arabic_language: 50, 
    mathematics: 40, 
    civic_education: 10, 
    art_education: 10, 
    physical_education: 10, 
    french_language: 30, 
    social_studies: 10, 
    natural_sciences: 10,  
  },
  [ClassLevel.AF6]: { 
    islamic_education: 30, 
    arabic_language: 50, 
    mathematics: 40, 
    civic_education: 10, 
    art_education: 10, 
    physical_education: 10, 
    french_language: 30, 
    social_studies: 10, 
    natural_sciences: 10, 
  }
};

export const DB_KEYS = {
  TEACHER: 'sta_teacher_profile',
  AUTH: 'sta_auth_pin',
  CLASSES: 'sta_classes',
  STUDENTS: 'sta_students',
  RESULTS: 'sta_results',
  ATTENDANCE: 'sta_attendance',
  LESSONS: 'sta_lessons',
};

// --- CURRICULUM DATA EXTRACTED FROM PDFS (SAMPLE) ---
// This represents a digitized version of the annual plans.
// Format: ID: {LEVEL}-{SUBJECT}-W{WEEK}

export const CURRICULUM_DATA: CurriculumTopic[] = [
  // --- AF3 ISLAMIC EDUCATION ---
  { id: 'AF3-ISL-W1', level: ClassLevel.AF3, subject: 'islamic_education', term: 1, week: 1, topic: 'استقبال التلاميذ وتقويم تشخيصي' },
  { id: 'AF3-ISL-W2', level: ClassLevel.AF3, subject: 'islamic_education', term: 1, week: 2, topic: 'سورة الأعلى: قراءة، شرح وحفظ', competency: 'استظهار السور المقررة' },
  { id: 'AF3-ISL-W3', level: ClassLevel.AF3, subject: 'islamic_education', term: 1, week: 3, topic: 'حديث: المؤمن للمؤمن كالبنيان', competency: 'الحديث الشريف' },
  { id: 'AF3-ISL-W4', level: ClassLevel.AF3, subject: 'islamic_education', term: 1, week: 4, topic: 'سورة الغاشية: قراءة وحفظ', competency: 'القرآن الكريم' },
  { id: 'AF3-ISL-W5', level: ClassLevel.AF3, subject: 'islamic_education', term: 1, week: 5, topic: 'أركان الإيمان: الإيمان بالله', competency: 'العقيدة' },
  { id: 'AF3-ISL-W7', level: ClassLevel.AF3, subject: 'islamic_education', term: 1, week: 7, topic: 'سورة الفجر: قراءة وحفظ' },
  { id: 'AF3-ISL-W14', level: ClassLevel.AF3, subject: 'islamic_education', term: 2, week: 14, topic: 'سورة الشمس: قراءة وحفظ' },

  // --- AF3 MATHEMATICS ---
  { id: 'AF3-MAT-W1', level: ClassLevel.AF3, subject: 'mathematics', term: 1, week: 1, topic: 'تقويم تشخيصي للمكتسبات القبلية' },
  { id: 'AF3-MAT-W2', level: ClassLevel.AF3, subject: 'mathematics', term: 1, week: 2, topic: 'الأعداد من 0 إلى 199: قراءة وكتابة' },
  { id: 'AF3-MAT-W3', level: ClassLevel.AF3, subject: 'mathematics', term: 1, week: 3, topic: 'الأعداد من 0 إلى 299: مقارنة وترتيب' },
  { id: 'AF3-MAT-W7', level: ClassLevel.AF3, subject: 'mathematics', term: 1, week: 7, topic: 'الأعداد إلى 599: تمييز المراتب' },
  { id: 'AF3-MAT-W14', level: ClassLevel.AF3, subject: 'mathematics', term: 2, week: 14, topic: 'الجمع بالاحتفاظ والطرح بالاستلاف' },
  { id: 'AF3-MAT-W27', level: ClassLevel.AF3, subject: 'mathematics', term: 3, week: 27, topic: 'مفهوم الضرب: جداول الضرب 1-7' },

  // --- AF3 SCIENCE ---
  { id: 'AF3-SCI-W2', level: ClassLevel.AF3, subject: 'natural_sciences', term: 1, week: 2, topic: 'تصنيف الأغذية: حبوب، خضروات، فواكه' },
  { id: 'AF3-SCI-W5', level: ClassLevel.AF3, subject: 'natural_sciences', term: 1, week: 5, topic: 'البقول والفواكه: مصادرها وفوائدها' },
  { id: 'AF3-SCI-W19', level: ClassLevel.AF3, subject: 'natural_sciences', term: 2, week: 19, topic: 'حالات المادة: الصلبة، السائلة، الغازية' },

   // --- AF4 HISTORY ---
  { id: 'AF4-HIS-W2', level: ClassLevel.AF4, subject: 'social_studies', term: 1, week: 2, topic: 'الآثار التاريخية في الولاية' },
  { id: 'AF4-HIS-W7', level: ClassLevel.AF4, subject: 'social_studies', term: 1, week: 7, topic: 'المقارنة بين الماضي والحاضر (المعمار والزي)' },

  // --- AF4 GEOGRAPHY ---
  { id: 'AF4-GEO-W3', level: ClassLevel.AF4, subject: 'social_studies', term: 1, week: 3, topic: 'قراءة خريطة الولاية: المفتاح والرموز' },
  { id: 'AF4-GEO-W8', level: ClassLevel.AF4, subject: 'social_studies', term: 1, week: 8, topic: 'الرموز التمثيلية في الخريطة' },
  
  // Generic Placeholders for other weeks to make the demo feel full
  ...Array.from({ length: 30 }).map((_, i) => ({
     id: `GEN-AR-${i+1}`, 
     level: ClassLevel.AF3, 
     subject: 'arabic_language', 
     term: (i < 11 ? 1 : i < 22 ? 2 : 3) as 1 | 2 | 3, 
     week: i + 1, 
     topic: `درس اللغة العربية - الأسبوع ${i+1}`
  })),
   ...Array.from({ length: 30 }).map((_, i) => ({
     id: `GEN-FR-${i+1}`, 
     level: ClassLevel.AF3, 
     subject: 'french_language', 
     term: (i < 11 ? 1 : i < 22 ? 2 : 3) as 1 | 2 | 3, 
     week: i + 1, 
     topic: `Leçon de Français - Semaine ${i+1}`
  })),
];
