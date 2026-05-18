"use client"

import { useState, useMemo } from "react"
import { Search, X } from "lucide-react"

// Symptom categories based on body system
const SYMPTOM_CATEGORIES: Record<string, string[]> = {
  "General & Fever": [
    "high_fever", "mild_fever", "chills", "shivering", "fatigue", "lethargy", 
    "malaise", "restlessness", "sweating", "dehydration"
  ],
  "Skin & Hair": [
    "itching", "skin_rash", "nodal_skin_eruptions", "yellowish_skin", 
    "skin_peeling", "pus_filled_pimples", "blackheads", "scurring",
    "dischromic_patches", "red_spots_over_body", "blister", 
    "red_sore_around_nose", "yellow_crust_ooze", "silver_like_dusting",
    "inflammatory_nails", "brittle_nails", "small_dents_in_nails"
  ],
  "Head & Neurological": [
    "headache", "dizziness", "spinning_movements", "loss_of_balance",
    "unsteadiness", "slurred_speech", "altered_sensorium", "coma",
    "visual_disturbances", "blurred_and_distorted_vision", "loss_of_smell",
    "lack_of_concentration", "depression", "anxiety", "irritability", "mood_swings"
  ],
  "Eyes, Ears & Nose": [
    "redness_of_eyes", "sunken_eyes", "watering_from_eyes", "pain_behind_the_eyes",
    "yellowing_of_eyes", "puffy_face_and_eyes", "continuous_sneezing", 
    "runny_nose", "congestion", "sinus_pressure", "loss_of_smell"
  ],
  "Throat & Respiratory": [
    "cough", "phlegm", "mucoid_sputum", "rusty_sputum", "blood_in_sputum",
    "throat_irritation", "patches_in_throat", "ulcers_on_tongue",
    "breathlessness", "chest_pain"
  ],
  "Digestive System": [
    "stomach_pain", "belly_pain", "abdominal_pain", "acidity", "indigestion",
    "nausea", "vomiting", "loss_of_appetite", "excessive_hunger", "increased_appetite",
    "constipation", "diarrhoea", "bloody_stool", "passage_of_gases",
    "pain_during_bowel_movements", "pain_in_anal_region", "irritation_in_anus",
    "internal_itching", "swelling_of_stomach", "distention_of_abdomen"
  ],
  "Urinary System": [
    "burning_micturition", "spotting_urination", "dark_urine", "yellow_urine",
    "bladder_discomfort", "foul_smell_of_urine", "continuous_feel_of_urine", "polyuria"
  ],
  "Musculoskeletal": [
    "joint_pain", "muscle_pain", "muscle_weakness", "muscle_wasting",
    "back_pain", "neck_pain", "knee_pain", "hip_joint_pain", "stiff_neck",
    "swelling_joints", "movement_stiffness", "painful_walking", 
    "weakness_in_limbs", "weakness_of_one_body_side", "cramps"
  ],
  "Cardiovascular": [
    "chest_pain", "fast_heart_rate", "palpitations", "swollen_blood_vessels",
    "prominent_veins_on_calf", "swollen_legs"
  ],
  "Weight & Metabolism": [
    "weight_gain", "weight_loss", "obesity", "irregular_sugar_level",
    "cold_hands_and_feets", "enlarged_thyroid", "swollen_extremeties"
  ],
  "Other Symptoms": [
    "fluid_overload", "swelled_lymph_nodes", "bruising", 
    "receiving_blood_transfusion", "receiving_unsterile_injections",
    "history_of_alcohol_consumption", "family_history", "extra_marital_contacts",
    "abnormal_menstruation", "toxic_look_(typhos)", "acute_liver_failure", "stomach_bleeding"
  ]
}

interface SymptomBrowserProps {
  onSelectSymptom: (symptom: string, display: string) => void
  isOpen: boolean
  onClose: () => void
}

export function SymptomBrowser({ onSelectSymptom, isOpen, onClose }: SymptomBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const formatSymptomDisplay = (symptom: string): string => {
    return symptom.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return SYMPTOM_CATEGORIES
    }
    
    const query = searchQuery.toLowerCase()
    const filtered: Record<string, string[]> = {}
    
    Object.entries(SYMPTOM_CATEGORIES).forEach(([category, symptoms]) => {
      const matchingSymptoms = symptoms.filter(s => 
        s.toLowerCase().includes(query) || 
        formatSymptomDisplay(s).toLowerCase().includes(query)
      )
      if (matchingSymptoms.length > 0) {
        filtered[category] = matchingSymptoms
      }
    })
    
    return filtered
  }, [searchQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50">
      <div className="w-full max-w-2xl max-h-[80vh] bg-card rounded-xl border border-border shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Select Your Symptom</h2>
            <p className="text-sm text-muted-foreground">
              Browse or search for your main symptom below
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symptoms (e.g., headache, fever, cough)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto border-b border-border">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {Object.keys(filteredCategories).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Symptoms grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(filteredCategories)
            .filter(([category]) => !selectedCategory || category === selectedCategory)
            .map(([category, symptoms]) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map(symptom => (
                    <button
                      key={symptom}
                      onClick={() => {
                        onSelectSymptom(symptom, formatSymptomDisplay(symptom))
                        onClose()
                      }}
                      className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all"
                    >
                      {formatSymptomDisplay(symptom)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {Object.keys(filteredCategories).length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No symptoms found matching "{searchQuery}"</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Can't find your symptom? Type it directly in the chat input below.
          </p>
        </div>
      </div>
    </div>
  )
}
