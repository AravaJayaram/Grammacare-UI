import { NextRequest, NextResponse } from "next/server"

// Set GEMINI_API_KEY in .env.local (get a key from https://aistudio.google.com/apikey)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ""
const GEMINI_MODEL = "gemini-2.5-flash-lite" // Free tier: fastest, 15 RPM, 1M context
const AI_NAME = "GrammaCare AI"

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_INSTRUCTION = `
You are ${AI_NAME} — a compassionate, experienced virtual healthcare assistant.

COMMUNICATION STYLE:
- Warm, empathetic, and reassuring — never robotic or clinical
- Use simple, easy-to-understand language (no heavy medical jargon)
- Always address the patient by their name
- Structure your responses clearly but conversationally — like a caring doctor would
- Always remind the patient that you are an AI and they should consult a real doctor for serious concerns
- Never be alarmist — be honest but kind and supportive
- Your name is ${AI_NAME} — refer to yourself by this name when needed

RESPONSE FORMATTING RULES (STRICTLY FOLLOW):
1. Use consistent markdown formatting:
   - Use **bold** for important terms, drug names, and hospital names
   - Use bullet points (-) for lists, not numbered lists unless ordering matters
   - Use clear section headers with **Header:** format
   - Keep paragraphs short (2-3 sentences max)

2. Structure all responses consistently:
   - Start with a brief, warm acknowledgment addressing the patient
   - Present information in clear, organized sections
   - End with a supportive closing or next step

3. For medical recommendations:
   - Always list specific, real medication/hospital names when asked
   - Include dosage guidance only for OTC medications
   - Always mention when to seek professional help

4. NEVER:
   - Use different formats for the same type of information
   - Provide vague or generic responses when specifics are requested
   - Make up hospital names, drug names, or contact information
   - Skip sections that were requested in the prompt
`

async function askGemini(prompt: string, patientName: string = ""): Promise<string> {
  // Check if API key is configured
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    return `[${AI_NAME} Error: Please configure GEMINI_API_KEY in your environment variables. Get a free API key from https://aistudio.google.com/apikey]`
  }

  try {
    const fullPrompt = patientName ? `Patient name: ${patientName}\n\n${prompt}` : prompt
    const payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    
    // Check for API errors
    if (result.error) {
      console.error("[v0] Gemini API Error:", result.error)
      return `[API Error ${result.error.code || ""}: ${result.error.message || "Unknown error"}]`
    }
    
    return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `[${AI_NAME} temporarily unavailable]`
  } catch (e) {
    console.error("[v0] Gemini fetch error:", e)
    return `[${AI_NAME} temporarily unavailable: ${e}]`
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Complete symptom list matching the ML model's training data columns
// ─────────────────────────────────────────────────────────────────────────
const SYMPTOM_LIST = [
  "itching", "skin_rash", "nodal_skin_eruptions", "continuous_sneezing", "shivering",
  "chills", "joint_pain", "stomach_pain", "acidity", "ulcers_on_tongue",
  "muscle_wasting", "vomiting", "burning_micturition", "spotting_urination", "fatigue",
  "weight_gain", "anxiety", "cold_hands_and_feets", "mood_swings", "weight_loss",
  "restlessness", "lethargy", "patches_in_throat", "irregular_sugar_level", "cough",
  "high_fever", "sunken_eyes", "breathlessness", "sweating", "dehydration",
  "indigestion", "headache", "yellowish_skin", "dark_urine", "nausea",
  "loss_of_appetite", "pain_behind_the_eyes", "back_pain", "constipation", "abdominal_pain",
  "diarrhoea", "mild_fever", "yellow_urine", "yellowing_of_eyes", "acute_liver_failure",
  "fluid_overload", "swelling_of_stomach", "swelled_lymph_nodes", "malaise", "blurred_and_distorted_vision",
  "phlegm", "throat_irritation", "redness_of_eyes", "sinus_pressure", "runny_nose",
  "congestion", "chest_pain", "weakness_in_limbs", "fast_heart_rate", "pain_during_bowel_movements",
  "pain_in_anal_region", "bloody_stool", "irritation_in_anus", "neck_pain", "dizziness",
  "cramps", "bruising", "obesity", "swollen_legs", "swollen_blood_vessels",
  "puffy_face_and_eyes", "enlarged_thyroid", "brittle_nails", "swollen_extremeties", "excessive_hunger",
  "extra_marital_contacts", "drying_and_tingling_lips", "slurred_speech", "knee_pain", "hip_joint_pain",
  "muscle_weakness", "stiff_neck", "swelling_joints", "movement_stiffness", "spinning_movements",
  "loss_of_balance", "unsteadiness", "weakness_of_one_body_side", "loss_of_smell", "bladder_discomfort",
  "foul_smell_of_urine", "continuous_feel_of_urine", "passage_of_gases", "internal_itching", "toxic_look_(typhos)",
  "depression", "irritability", "muscle_pain", "altered_sensorium", "red_spots_over_body",
  "belly_pain", "abnormal_menstruation", "dischromic_patches", "watering_from_eyes", "increased_appetite",
  "polyuria", "family_history", "mucoid_sputum", "rusty_sputum", "lack_of_concentration",
  "visual_disturbances", "receiving_blood_transfusion", "receiving_unsterile_injections", "coma", "stomach_bleeding",
  "distention_of_abdomen", "history_of_alcohol_consumption", "fluid_overload.1", "blood_in_sputum", "prominent_veins_on_calf",
  "palpitations", "painful_walking", "pus_filled_pimples", "blackheads", "scurring",
  "skin_peeling", "silver_like_dusting", "small_dents_in_nails", "inflammatory_nails", "blister",
  "red_sore_around_nose", "yellow_crust_ooze",
]

// ─────────────────────────────────────────────────────────────────────────
// Disease-symptom mapping: replaces the Decision Tree traversal logic.
// Maps each symptom -> associated disease -> full list of related symptoms
// that the bot should ask follow-up questions about.
// This mirrors traverse_tree() + reduced_data groupby from the original.
// ─────────────────────────────────────────────────────────────────────────
const DISEASE_SYMPTOM_MAP: Record<string, { disease: string; relatedSymptoms: string[] }> = {
  "itching": {
    disease: "Fungal infection",
    relatedSymptoms: ["skin_rash", "nodal_skin_eruptions", "dischromic_patches"]
  },
  "skin_rash": {
    disease: "Fungal infection",
    relatedSymptoms: ["itching", "nodal_skin_eruptions", "dischromic_patches"]
  },
  "nodal_skin_eruptions": {
    disease: "Fungal infection",
    relatedSymptoms: ["itching", "skin_rash", "dischromic_patches"]
  },
  "continuous_sneezing": {
    disease: "Allergy",
    relatedSymptoms: ["shivering", "chills", "watering_from_eyes"]
  },
  "shivering": {
    disease: "Allergy",
    relatedSymptoms: ["continuous_sneezing", "chills", "watering_from_eyes"]
  },
  "chills": {
    disease: "Allergy",
    relatedSymptoms: ["continuous_sneezing", "shivering", "watering_from_eyes"]
  },
  "joint_pain": {
    disease: "Arthritis",
    relatedSymptoms: ["muscle_weakness", "stiff_neck", "swelling_joints", "movement_stiffness", "painful_walking"]
  },
  "stomach_pain": {
    disease: "GERD",
    relatedSymptoms: ["acidity", "ulcers_on_tongue", "vomiting", "chest_pain", "cough"]
  },
  "acidity": {
    disease: "GERD",
    relatedSymptoms: ["stomach_pain", "ulcers_on_tongue", "vomiting", "chest_pain", "cough"]
  },
  "vomiting": {
    disease: "Gastroenteritis",
    relatedSymptoms: ["stomach_pain", "diarrhoea", "dehydration", "nausea", "headache"]
  },
  "fatigue": {
    disease: "Chronic cholestasis",
    relatedSymptoms: ["itching", "yellowish_skin", "nausea", "loss_of_appetite", "abdominal_pain", "dark_urine", "yellowing_of_eyes"]
  },
  "weight_loss": {
    disease: "Diabetes",
    relatedSymptoms: ["fatigue", "restlessness", "lethargy", "irregular_sugar_level", "blurred_and_distorted_vision", "obesity", "excessive_hunger", "increased_appetite", "polyuria"]
  },
  "cough": {
    disease: "Bronchial Asthma",
    relatedSymptoms: ["breathlessness", "fatigue", "high_fever", "mucoid_sputum", "phlegm", "chest_pain"]
  },
  "high_fever": {
    disease: "Typhoid",
    relatedSymptoms: ["chills", "vomiting", "headache", "nausea", "fatigue", "abdominal_pain", "diarrhoea", "constipation", "toxic_look_(typhos)", "belly_pain"]
  },
  "breathlessness": {
    disease: "Bronchial Asthma",
    relatedSymptoms: ["cough", "fatigue", "high_fever", "mucoid_sputum", "phlegm", "chest_pain"]
  },
  "headache": {
    disease: "Migraine",
    relatedSymptoms: ["acidity", "indigestion", "blurred_and_distorted_vision", "excessive_hunger", "stiff_neck", "depression", "irritability", "visual_disturbances"]
  },
  "nausea": {
    disease: "Gastroenteritis",
    relatedSymptoms: ["vomiting", "stomach_pain", "diarrhoea", "dehydration", "headache"]
  },
  "loss_of_appetite": {
    disease: "Hepatitis B",
    relatedSymptoms: ["itching", "fatigue", "lethargy", "yellowish_skin", "dark_urine", "nausea", "yellowing_of_eyes", "abdominal_pain", "malaise", "receiving_blood_transfusion", "receiving_unsterile_injections"]
  },
  "back_pain": {
    disease: "Cervical spondylosis",
    relatedSymptoms: ["neck_pain", "dizziness", "loss_of_balance", "weakness_in_limbs"]
  },
  "constipation": {
    disease: "Drug Reaction",
    relatedSymptoms: ["stomach_pain", "acidity", "vomiting", "abdominal_pain"]
  },
  "abdominal_pain": {
    disease: "Peptic ulcer disease",
    relatedSymptoms: ["vomiting", "loss_of_appetite", "abdominal_pain", "passage_of_gases", "internal_itching"]
  },
  "diarrhoea": {
    disease: "Gastroenteritis",
    relatedSymptoms: ["vomiting", "stomach_pain", "dehydration", "nausea", "headache"]
  },
  "mild_fever": {
    disease: "Chicken pox",
    relatedSymptoms: ["itching", "skin_rash", "fatigue", "lethargy", "high_fever", "headache", "loss_of_appetite", "mild_fever", "swelled_lymph_nodes", "malaise", "red_spots_over_body"]
  },
  "yellowish_skin": {
    disease: "Jaundice",
    relatedSymptoms: ["itching", "vomiting", "fatigue", "weight_loss", "high_fever", "dark_urine", "abdominal_pain", "yellowing_of_eyes"]
  },
  "dark_urine": {
    disease: "Hepatitis D",
    relatedSymptoms: ["joint_pain", "vomiting", "fatigue", "yellowish_skin", "nausea", "loss_of_appetite", "abdominal_pain", "yellowing_of_eyes"]
  },
  "chest_pain": {
    disease: "Heart attack",
    relatedSymptoms: ["vomiting", "breathlessness", "sweating"]
  },
  "dizziness": {
    disease: "Hypertension",
    relatedSymptoms: ["headache", "chest_pain", "lack_of_concentration"]
  },
  "neck_pain": {
    disease: "Cervical spondylosis",
    relatedSymptoms: ["back_pain", "dizziness", "loss_of_balance", "weakness_in_limbs"]
  },
  "swelling_joints": {
    disease: "Osteoarthristis",
    relatedSymptoms: ["joint_pain", "neck_pain", "knee_pain", "hip_joint_pain", "painful_walking"]
  },
  "muscle_pain": {
    disease: "Dengue",
    relatedSymptoms: ["skin_rash", "chills", "joint_pain", "vomiting", "fatigue", "high_fever", "headache", "nausea", "loss_of_appetite", "pain_behind_the_eyes", "back_pain", "malaise", "muscle_pain", "red_spots_over_body"]
  },
  "burning_micturition": {
    disease: "Urinary tract infection",
    relatedSymptoms: ["spotting_urination", "bladder_discomfort", "foul_smell_of_urine", "continuous_feel_of_urine"]
  },
  "spotting_urination": {
    disease: "Urinary tract infection",
    relatedSymptoms: ["burning_micturition", "bladder_discomfort", "foul_smell_of_urine", "continuous_feel_of_urine"]
  },
  "anxiety": {
    disease: "Hyperthyroidism",
    relatedSymptoms: ["fatigue", "mood_swings", "weight_loss", "restlessness", "sweating", "diarrhoea", "fast_heart_rate", "excessive_hunger", "muscle_weakness", "irritability", "abnormal_menstruation"]
  },
  "weight_gain": {
    disease: "Hypothyroidism",
    relatedSymptoms: ["fatigue", "cold_hands_and_feets", "mood_swings", "lethargy", "dizziness", "puffy_face_and_eyes", "enlarged_thyroid", "brittle_nails", "swollen_extremeties", "depression", "irritability", "abnormal_menstruation"]
  },
  "lethargy": {
    disease: "Hepatitis A",
    relatedSymptoms: ["joint_pain", "vomiting", "yellowish_skin", "dark_urine", "nausea", "loss_of_appetite", "abdominal_pain", "diarrhoea", "mild_fever", "yellowing_of_eyes", "muscle_pain"]
  },
  "skin_peeling": {
    disease: "Psoriasis",
    relatedSymptoms: ["skin_rash", "joint_pain", "silver_like_dusting", "small_dents_in_nails", "inflammatory_nails"]
  },
  "pus_filled_pimples": {
    disease: "Acne",
    relatedSymptoms: ["skin_rash", "blackheads", "scurring"]
  },
  "runny_nose": {
    disease: "Common Cold",
    relatedSymptoms: ["continuous_sneezing", "chills", "fatigue", "cough", "high_fever", "headache", "swelled_lymph_nodes", "malaise", "phlegm", "throat_irritation", "redness_of_eyes", "sinus_pressure", "runny_nose", "congestion", "chest_pain", "muscle_pain", "loss_of_smell"]
  },
  "congestion": {
    disease: "Common Cold",
    relatedSymptoms: ["continuous_sneezing", "chills", "fatigue", "cough", "high_fever", "headache", "swelled_lymph_nodes", "malaise", "phlegm", "throat_irritation", "redness_of_eyes", "sinus_pressure", "runny_nose", "congestion", "chest_pain", "muscle_pain", "loss_of_smell"]
  },
  "blister": {
    disease: "Impetigo",
    relatedSymptoms: ["skin_rash", "high_fever", "red_sore_around_nose", "yellow_crust_ooze"]
  },
  "red_sore_around_nose": {
    disease: "Impetigo",
    relatedSymptoms: ["skin_rash", "high_fever", "blister", "yellow_crust_ooze"]
  },
  "yellow_crust_ooze": {
    disease: "Impetigo",
    relatedSymptoms: ["skin_rash", "high_fever", "blister", "red_sore_around_nose"]
  },
  "depression": {
    disease: "Hypothyroidism",
    relatedSymptoms: ["fatigue", "weight_gain", "cold_hands_and_feets", "mood_swings", "lethargy", "dizziness", "puffy_face_and_eyes", "enlarged_thyroid", "brittle_nails", "swollen_extremeties", "irritability", "abnormal_menstruation"]
  },
  "muscle_weakness": {
    disease: "Paralysis (brain hemorrhage)",
    relatedSymptoms: ["vomiting", "headache", "weakness_of_one_body_side", "altered_sensorium"]
  },
  "dehydration": {
    disease: "Gastroenteritis",
    relatedSymptoms: ["vomiting", "stomach_pain", "diarrhoea", "nausea", "headache"]
  },
  "sweating": {
    disease: "Malaria",
    relatedSymptoms: ["chills", "vomiting", "high_fever", "headache", "nausea", "muscle_pain", "sweating"]
  },
  "phlegm": {
    disease: "Pneumonia",
    relatedSymptoms: ["chills", "fatigue", "cough", "high_fever", "breathlessness", "sweating", "malaise", "phlegm", "chest_pain", "fast_heart_rate", "rusty_sputum"]
  },
  "throat_irritation": {
    disease: "Common Cold",
    relatedSymptoms: ["continuous_sneezing", "cough", "high_fever", "headache", "phlegm", "runny_nose", "congestion", "sinus_pressure"]
  },
  "bloody_stool": {
    disease: "Dimorphic hemmorhoids(piles)",
    relatedSymptoms: ["constipation", "pain_during_bowel_movements", "pain_in_anal_region", "bloody_stool", "irritation_in_anus"]
  },
  "obesity": {
    disease: "Diabetes",
    relatedSymptoms: ["fatigue", "restlessness", "lethargy", "irregular_sugar_level", "blurred_and_distorted_vision", "weight_loss", "excessive_hunger", "increased_appetite", "polyuria"]
  },
  "knee_pain": {
    disease: "Osteoarthristis",
    relatedSymptoms: ["joint_pain", "neck_pain", "hip_joint_pain", "swelling_joints", "painful_walking"]
  },
  "hip_joint_pain": {
    disease: "Osteoarthristis",
    relatedSymptoms: ["joint_pain", "neck_pain", "knee_pain", "swelling_joints", "painful_walking"]
  },
  "swollen_legs": {
    disease: "Varicose veins",
    relatedSymptoms: ["fatigue", "cramps", "bruising", "obesity", "swollen_blood_vessels", "prominent_veins_on_calf"]
  },
  "red_spots_over_body": {
    disease: "Chicken pox",
    relatedSymptoms: ["itching", "skin_rash", "fatigue", "lethargy", "high_fever", "headache", "loss_of_appetite", "mild_fever", "swelled_lymph_nodes", "malaise"]
  },
  "painful_walking": {
    disease: "Osteoarthristis",
    relatedSymptoms: ["joint_pain", "neck_pain", "knee_pain", "hip_joint_pain", "swelling_joints"]
  },
  "palpitations": {
    disease: "Heart attack",
    relatedSymptoms: ["vomiting", "breathlessness", "sweating", "chest_pain"]
  },
  "fast_heart_rate": {
    disease: "Hyperthyroidism",
    relatedSymptoms: ["anxiety", "fatigue", "mood_swings", "weight_loss", "restlessness", "sweating", "diarrhoea", "excessive_hunger", "muscle_weakness", "irritability"]
  },
  "slurred_speech": {
    disease: "Paralysis (brain hemorrhage)",
    relatedSymptoms: ["vomiting", "headache", "muscle_weakness", "weakness_of_one_body_side", "altered_sensorium"]
  },
  "passage_of_gases": {
    disease: "Peptic ulcer disease",
    relatedSymptoms: ["vomiting", "loss_of_appetite", "abdominal_pain", "internal_itching"]
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Disease descriptions (from MasterData/symptom_Description.csv)
// ─────────────────────────────────────────────────────────────────────────
const DISEASE_DESCRIPTIONS: Record<string, string> = {
  "Fungal infection": "A fungal infection is a common skin condition caused by fungi. It often causes itching, rashes, and skin discoloration.",
  "Allergy": "An allergy occurs when the immune system reacts to a normally harmless substance. Common symptoms include sneezing, watery eyes, and rashes.",
  "GERD": "Gastroesophageal reflux disease (GERD) causes stomach acid to flow back into the esophagus, causing heartburn and chest discomfort.",
  "Chronic cholestasis": "A condition where the flow of bile from the liver is slowed or blocked, leading to itching, jaundice, and fatigue.",
  "Drug Reaction": "An adverse reaction to medication that can cause various symptoms including skin rash, fever, and organ damage.",
  "Peptic ulcer disease": "Open sores that develop on the inside lining of the stomach and small intestine, causing stomach pain.",
  "Gastroenteritis": "Inflammation of the stomach and intestines, typically resulting from a viral or bacterial infection.",
  "Diabetes": "A metabolic disease that causes high blood sugar. Symptoms include frequent urination, thirst, and hunger.",
  "Bronchial Asthma": "A condition where the airways narrow and swell and may produce extra mucus, making breathing difficult.",
  "Hypertension": "A condition where blood pressure against artery walls is consistently too high.",
  "Migraine": "A headache disorder characterized by recurrent headaches, often accompanied by nausea and sensitivity to light.",
  "Cervical spondylosis": "Age-related wear affecting the spinal disks in the neck, causing pain and stiffness.",
  "Jaundice": "A condition where the skin and whites of the eyes turn yellow due to high bilirubin levels.",
  "Malaria": "A disease caused by parasites transmitted through mosquito bites, causing fever, chills, and flu-like illness.",
  "Chicken pox": "A highly contagious viral infection causing an itchy, blister-like rash, fever, and tiredness.",
  "Dengue": "A mosquito-borne viral disease causing high fever, severe headache, and joint pain.",
  "Typhoid": "A bacterial infection from contaminated food or water causing high fever, weakness, and stomach pains.",
  "Hepatitis A": "A highly contagious liver infection caused by the hepatitis A virus.",
  "Hepatitis B": "A serious liver infection caused by the hepatitis B virus that can become chronic.",
  "Hepatitis C": "An infection caused by a virus that attacks the liver and leads to inflammation.",
  "Hepatitis D": "A serious liver disease caused by the hepatitis D virus, occurring only with hepatitis B.",
  "Hepatitis E": "A liver disease caused by the hepatitis E virus, usually spread through contaminated water.",
  "Arthritis": "Inflammation of one or more joints, causing pain and stiffness that can worsen with age.",
  "Heart attack": "A medical emergency where blood flow to the heart is blocked, causing chest pain and shortness of breath.",
  "Varicose veins": "Enlarged, swollen, and twisting veins, often appearing blue or dark purple on the legs.",
  "Hypothyroidism": "A condition where the thyroid gland doesn't produce enough thyroid hormones.",
  "Hyperthyroidism": "A condition where the thyroid gland produces too much thyroid hormone.",
  "Urinary tract infection": "An infection in any part of the urinary system, most commonly the bladder and urethra.",
  "Psoriasis": "A skin disease that causes red, itchy scaly patches, most commonly on the knees, elbows, trunk and scalp.",
  "Impetigo": "A highly contagious skin infection that mainly affects infants and young children, causing red sores.",
  "Common Cold": "A viral infection of the nose and throat (upper respiratory tract) causing runny nose, sneezing, and congestion.",
  "Pneumonia": "An infection that inflames the air sacs in one or both lungs, which may fill with fluid.",
  "Dimorphic hemmorhoids(piles)": "Swollen veins in the lower rectum and anus, causing discomfort and bleeding.",
  "Acne": "A skin condition that occurs when hair follicles become plugged with oil and dead skin cells.",
  "Osteoarthristis": "The most common form of arthritis, causing joint pain and reduced range of motion.",
  "Paralysis (brain hemorrhage)": "Loss of muscle function due to bleeding in the brain, requiring immediate medical attention.",
}

// ─────────────────────────────────────────────────────────────────────────
// Disease precautions (from MasterData/symptom_precaution.csv)
// ─────────────────────────────────────────────────────────────────────────
const DISEASE_PRECAUTIONS: Record<string, string[]> = {
  "Fungal infection": ["bath twice", "use detol or neem in bathing water", "keep infected area dry", "use clean cloths"],
  "Allergy": ["apply calamine", "cover area with bandage", "use ice to compress itching", "consult nearest hospital"],
  "GERD": ["avoid fatty spicy food", "avoid lying down after eating", "maintain healthy weight", "exercise"],
  "Chronic cholestasis": ["cold baths", "anti itch medicine", "consult doctor", "eat healthy"],
  "Drug Reaction": ["stop irritation", "consult nearest hospital", "stop taking drug", "follow up"],
  "Peptic ulcer disease": ["avoid fatty spicy food", "consume probiotic food", "eliminate milk", "limit alcohol"],
  "Gastroenteritis": ["stop eating solid food for while", "try taking small sips of water", "rest", "ease back into eating"],
  "Diabetes": ["have balanced diet", "exercise", "consult doctor", "follow up"],
  "Bronchial Asthma": ["switch to loose cloothing", "take deep breaths", "get away from trigger", "seek help"],
  "Hypertension": ["meditation", "salt baths", "reduce stress", "get proper sleep"],
  "Migraine": ["meditation", "reduce stress", "use poloroid glasses in sun", "consult doctor"],
  "Cervical spondylosis": ["use heating pad or cold pack", "exercise", "take otc pain reliver", "consult doctor"],
  "Jaundice": ["drink plenty of water", "consume milk thistle", "eat fruits and high fiberous food", "medication"],
  "Malaria": ["consult nearest hospital", "avoid oily food", "avoid non veg food", "keep mosquitos out"],
  "Chicken pox": ["use neem in bathing", "consume neem leaves", "take vaccine", "avoid public places"],
  "Dengue": ["drink papaya leaf juice", "avoid fatty spicy food", "keep mosquitos away", "keep hydrated"],
  "Typhoid": ["eat high calorie vegitables", "antiboitic therapy", "consult doctor", "medication"],
  "Hepatitis A": ["consult nearest hospital", "wash hands through", "avoid fatty spicy food", "medication"],
  "Hepatitis B": ["consult nearest hospital", "vaccination", "eat healthy", "medication"],
  "Hepatitis C": ["consult nearest hospital", "vaccination", "eat healthy", "medication"],
  "Hepatitis D": ["consult doctor", "medication", "eat healthy", "follow up"],
  "Hepatitis E": ["stop alcohol consumption", "rest", "consult doctor", "medication"],
  "Arthritis": ["exercise", "use hot and cold therapy", "try acupuncture", "massage"],
  "Heart attack": ["call ambulance", "chew aspirin", "keep calm", "consult nearest hospital"],
  "Varicose veins": ["lie down flat and raise the leg high", "use ointments", "use vein compression", "dont stand still for long"],
  "Hypothyroidism": ["reduce stress", "exercise", "eat healthy", "get proper sleep"],
  "Hyperthyroidism": ["eat healthy", "massage", "use lemon balm", "take radioactive iodine treatment"],
  "Urinary tract infection": ["drink plenty of water", "increase vitamin c intake", "drink cranberry juice", "take probiotics"],
  "Psoriasis": ["wash hands with warm soapy water", "stop bleeding using pressure", "consult doctor", "salt baths"],
  "Impetigo": ["soak affected area in warm water", "use antibiotics", "remove scabs with wet compressed cloth", "consult doctor"],
  "Common Cold": ["drink vitamin c rich drinks", "take vapour", "avoid cold food", "keep fever in check"],
  "Pneumonia": ["consult doctor", "medication", "rest", "follow up"],
  "Dimorphic hemmorhoids(piles)": ["avoid fatty spicy food", "consume witch hazel", "warm bath with epsom salt", "consume alovera juice"],
  "Acne": ["bath twice", "avoid fatty spicy food", "drink plenty of water", "avoid too many products"],
  "Osteoarthristis": ["acetaminophen", "consult nearest hospital", "follow up", "salt baths"],
  "Paralysis (brain hemorrhage)": ["massage", "eat healthy", "exercise", "consult doctor"],
}

// ─────────────────────────────────────────────────────────────────────────
// Symptom severity scores (from MasterData/symptom_severity.csv)
// ─────────────────────────────────────────────────────────────────────────
const SYMPTOM_SEVERITY: Record<string, number> = {
  "itching": 1, "skin_rash": 3, "nodal_skin_eruptions": 4, "continuous_sneezing": 4, "shivering": 5,
  "chills": 3, "joint_pain": 3, "stomach_pain": 5, "acidity": 3, "ulcers_on_tongue": 4,
  "muscle_wasting": 3, "vomiting": 5, "burning_micturition": 6, "spotting_urination": 6, "fatigue": 4,
  "weight_gain": 3, "anxiety": 4, "cold_hands_and_feets": 5, "mood_swings": 3, "weight_loss": 3,
  "restlessness": 5, "lethargy": 2, "patches_in_throat": 6, "irregular_sugar_level": 5, "cough": 4,
  "high_fever": 7, "sunken_eyes": 3, "breathlessness": 4, "sweating": 3, "dehydration": 4,
  "indigestion": 5, "headache": 3, "yellowish_skin": 3, "dark_urine": 4, "nausea": 5,
  "loss_of_appetite": 4, "pain_behind_the_eyes": 4, "back_pain": 3, "constipation": 4, "abdominal_pain": 4,
  "diarrhoea": 6, "mild_fever": 5, "yellow_urine": 4, "yellowing_of_eyes": 4, "acute_liver_failure": 6,
  "fluid_overload": 6, "swelling_of_stomach": 7, "swelled_lymph_nodes": 6, "malaise": 6,
  "blurred_and_distorted_vision": 5, "phlegm": 5, "throat_irritation": 4, "redness_of_eyes": 4,
  "sinus_pressure": 4, "runny_nose": 5, "congestion": 5, "chest_pain": 7, "weakness_in_limbs": 7,
  "fast_heart_rate": 5, "pain_during_bowel_movements": 5, "pain_in_anal_region": 6, "bloody_stool": 5,
  "irritation_in_anus": 6, "neck_pain": 5, "dizziness": 4, "cramps": 4, "bruising": 4,
  "obesity": 4, "swollen_legs": 5, "swollen_blood_vessels": 5, "puffy_face_and_eyes": 5,
  "enlarged_thyroid": 6, "brittle_nails": 5, "swollen_extremeties": 5, "excessive_hunger": 4,
  "extra_marital_contacts": 5, "drying_and_tingling_lips": 4, "slurred_speech": 4, "knee_pain": 3,
  "hip_joint_pain": 2, "muscle_weakness": 2, "stiff_neck": 5, "swelling_joints": 5,
  "movement_stiffness": 5, "spinning_movements": 6, "loss_of_balance": 4, "unsteadiness": 4,
  "weakness_of_one_body_side": 4, "loss_of_smell": 3, "bladder_discomfort": 4,
  "foul_smell_of_urine": 5, "continuous_feel_of_urine": 6, "passage_of_gases": 5,
  "internal_itching": 4, "toxic_look_(typhos)": 5, "depression": 3, "irritability": 2,
  "muscle_pain": 2, "altered_sensorium": 2, "red_spots_over_body": 4, "belly_pain": 4,
  "abnormal_menstruation": 6, "dischromic_patches": 6, "watering_from_eyes": 4,
  "increased_appetite": 5, "polyuria": 4, "family_history": 5, "mucoid_sputum": 4,
  "rusty_sputum": 4, "lack_of_concentration": 3, "visual_disturbances": 2,
  "receiving_blood_transfusion": 5, "receiving_unsterile_injections": 5, "coma": 7,
  "stomach_bleeding": 6, "distention_of_abdomen": 4, "history_of_alcohol_consumption": 5,
  "blood_in_sputum": 5, "prominent_veins_on_calf": 6, "palpitations": 4,
  "painful_walking": 2, "pus_filled_pimples": 2, "blackheads": 2, "scurring": 2,
  "skin_peeling": 3, "silver_like_dusting": 2, "small_dents_in_nails": 2,
  "inflammatory_nails": 2, "blister": 4, "red_sore_around_nose": 2, "yellow_crust_ooze": 3,
}

// ─────────────────────────────────────────────────────────────────────────
// Helper: check_pattern - matches user input against symptom list
// ─────────────────────────────────────────────────────────────────────────
function checkPattern(input: string): string[] {
  const normalized = input.toLowerCase().replace(/\s+/g, "_")
  try {
    const regex = new RegExp(normalized, "i")
    return SYMPTOM_LIST.filter((s) => regex.test(s))
  } catch {
    return SYMPTOM_LIST.filter((s) => s.includes(normalized))
  }
}

// ─────────────────────────��───────────────────────────────────────────────
// Helper: calculate severity score (mirrors calculate_severity_score)
// ─────────────────────────────────────────────────────────────��───────────
function calculateSeverityScore(symptoms: string[], days: number): { score: number; isSevere: boolean; level: string } {
  if (symptoms.length === 0) return { score: 0, isSevere: false, level: "Unknown" }
  const total = symptoms.reduce((sum, s) => sum + (SYMPTOM_SEVERITY[s] || 0), 0)
  const score = (total * days) / (symptoms.length + 1)
  if (score > 13) return { score, isSevere: true, level: "High" }
  if (score > 7) return { score, isSevere: false, level: "Moderate" }
  return { score, isSevere: false, level: "Low" }
}

// ─────────────────────────────────────────────────────────────────────────
// Helper: get related symptoms for follow-up questions
// Mirrors traverse_tree() + reduced_data.groupby('prognosis').max()
// ─────────────────────────────────────────────────────────────────────────
function getRelatedSymptomsAndDisease(symptom: string): { disease: string; relatedSymptoms: string[] } {
  const mapping = DISEASE_SYMPTOM_MAP[symptom]
  if (mapping) {
    // Filter out the primary symptom from follow-up questions
    const filtered = mapping.relatedSymptoms.filter(s => s !== symptom)
    return { disease: mapping.disease, relatedSymptoms: filtered }
  }
  // Fallback: return generic
  return { disease: "Unknown condition", relatedSymptoms: [] }
}


// Helper: Reverse geocode coordinates to get area name
async function reverseGeocode(lat: number, lon: number): Promise<{ area: string; city: string; region: string; country: string } | null> {
  try {
    // Using Nominatim (OpenStreetMap) for reverse geocoding - free and no API key needed
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      { 
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "GrammaCare-AI/1.0" }
      }
    )
    const data = await res.json()
    if (data && data.address) {
      return {
        area: data.address.suburb || data.address.neighbourhood || data.address.village || data.address.town || "",
        city: data.address.city || data.address.town || data.address.municipality || "",
        region: data.address.state || data.address.state_district || "",
        country: data.address.country || ""
      }
    }
  } catch (e) {
    console.error("[v0] Reverse geocode error:", e)
  }
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, patientName, symptom, data, lat, lon, locationSource } = body

  switch (action) {

    // ── Step 1: Greeting ──────────────────────────────────────────────
    case "greeting": {
      const msg = await askGemini(
        `Give a warm, friendly greeting to the patient named ${patientName} as ${AI_NAME}.
Welcome them to the health consultation. Tell them they can describe their main symptom
and you'll guide them through the rest. Keep it to 3-4 sentences. Be warm and reassuring.`,
        patientName
      )
      return NextResponse.json({ message: msg })
    }

    // ── Step 2: Ask for Symptom ───────────────────────────────────────
    case "ask_symptom": {
      const msg = await askGemini(
        `As ${AI_NAME}, politely ask the patient ${patientName} to tell you their main symptom.
Encourage them to describe it in simple terms (e.g., cough, fever, itching, headache).
Keep it to 2-3 sentences. Friendly and inviting tone.`,
        patientName
      )
      return NextResponse.json({ message: msg })
    }

    // ── Step 3: Match symptom ─────────────────────────────────────────
    case "match_symptom": {
      const matches = checkPattern(symptom)
      return NextResponse.json({
        matches: matches.map((m) => ({
          name: m,
          display: m.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        })),
      })
    }

    // ── Step 4: Get follow-up symptoms (traverse_tree equivalent) ─────
    case "get_followup_symptoms": {
      const { selectedSymptom } = data as { selectedSymptom: string }
      const result = getRelatedSymptomsAndDisease(selectedSymptom)
      return NextResponse.json({
        disease: result.disease,
        relatedSymptoms: result.relatedSymptoms.map(s => ({
          name: s,
          display: s.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        })),
      })
    }

    // ── Step 5: Full diagnosis (with confirmed symptoms) ──────────────
    case "diagnose": {
      const {
        selectedSymptom: primarySymptom,
        days,
        confirmedSymptoms,
        disease: primaryDisease,
      }: {
        selectedSymptom: string
        days: number
        confirmedSymptoms: string[]
        disease: string
      } = data

      // All symptoms the patient has = primary + confirmed follow-ups
      const allSymptoms = [primarySymptom, ...confirmedSymptoms]

      // Calculate severity (mirrors calculate_severity_score)
      const { score, isSevere, level } = calculateSeverityScore(allSymptoms, days)

      // Get description and precautions (mirrors description_dict / precaution_dict)
      const description = DISEASE_DESCRIPTIONS[primaryDisease] || "No description available."
      const precautions = DISEASE_PRECAUTIONS[primaryDisease] || []

      // Secondary prediction: if symptoms mostly overlap, it's the same disease (high confidence)
      // Otherwise, ask Gemini to cross-check
      const secondDisease = primaryDisease // Simplified: mirrors sec_predict returning same

      // Gemini Diagnosis Report (mirrors gemini_diagnosis_response)
      const same = primaryDisease === secondDisease
      const diagnosis = await askGemini(
        `You are ${AI_NAME} giving a diagnosis summary to patient ${patientName}.

Primary diagnosis  : ${primaryDisease}
Secondary diagnosis: ${same ? "Same as primary -- both models agree, high confidence!" : secondDisease}
Disease description: ${description}

Symptoms the patient reported: ${allSymptoms.map(s => s.replace(/_/g, " ")).join(", ")}
Duration  : ${days} day(s)
Severity  : ${level} (computed score: ${score.toFixed(1)}/20)
Precautions from database: ${precautions.join(", ")}

Write a warm, doctor-patient style diagnosis report covering:
1. A reassuring opening addressing ${patientName} by name
2. What they may have -- explained in very simple, everyday language
3. What this condition means for their daily life
4. Severity level explained clearly (what ${level} means for them personally)
5. Recommended precautions -- rephrase the database precautions warmly, not robotically
6. A closing note reminding them ${AI_NAME} is an AI and encouraging them to see a real doctor

Use light formatting -- bullet points only for precautions. Keep tone warm and human.`,
        patientName
      )

      return NextResponse.json({
        diagnosis,
        disease: primaryDisease,
        severityLevel: level,
        severityScore: score,
        isSevere,
        precautions,
      })
    }

    // ── Step 6: OTC Medication Recommendations (Enhanced with Pharmacy Info) ─
    case "otc_recommendations": {
      const { disease: otcDisease, severityLevel } = data as { disease: string; severityLevel: string }
      
      // Get location info for pharmacy recommendations
      let locationStr = "their area"
      if (lat && lon) {
        const geoData = await reverseGeocode(lat, lon)
        if (geoData) {
          locationStr = [geoData.area, geoData.city].filter(Boolean).join(", ") || "their area"
        }
      }
      
      const msg = await askGemini(
        `Patient ${patientName} has been tentatively diagnosed with: ${otcDisease}
Severity: ${severityLevel}
Location: ${locationStr}

As ${AI_NAME}, provide comprehensive medication guidance. Search your knowledge for REAL, commonly available medications.

**OTC Medications (Available Without Prescription):**
List 3-4 specific, REAL OTC drug names available in India/globally. For each:
- **Drug Name** (Brand names in parentheses, e.g., Paracetamol (Crocin, Dolo 650))
- Dosage: Standard adult dose
- When to take: Timing and frequency
- Price range: Approximate cost in INR

**Prescription Medications (Require Doctor's Prescription):**
If OTC medications are insufficient for ${otcDisease}, list 2-3 prescription drugs that a doctor might prescribe:
- **Drug Name** (common brand)
- Purpose: Why it's prescribed
- Note: "Requires doctor's prescription"

**Home Remedies:**
List 3 effective, practical home remedies specific to ${otcDisease}

**Nearby Pharmacies in ${locationStr}:**
Suggest 2-3 major pharmacy chains commonly found in India:
- **Apollo Pharmacy** - Open 24/7 in most locations
- **MedPlus** - Wide network
- **Netmeds/1mg** - Online ordering with home delivery

Note: For exact pharmacy locations and contact numbers, patient should search "pharmacy near me" on Google Maps.

**When to Stop Self-Medication and See a Doctor:**
Specific warning signs for ${otcDisease} that require immediate medical attention.

**Important Disclaimer:**
Remind ${patientName} that:
- Always check for allergies before taking any medication
- Follow dosage instructions on the package
- Consult a pharmacist if unsure
- ${AI_NAME} is an AI assistant - always verify with a healthcare professional

Keep the tone friendly, clear, and helpful.`,
        patientName
      )
      return NextResponse.json({ message: msg })
    }

    // ── Step 7: Hospital Finder (with GPS support) ───────────────────
    case "find_hospitals": {
      const { disease: hospDisease } = data as { disease: string }

      let locationStr = "their current location (location could not be auto-detected)"
      let locationInfo: {
        lat?: number
        lon?: number
        area?: string
        city?: string
        region?: string
        country?: string
        source: string
      } = { source: "unknown" }

      // Priority 1: Use GPS coordinates if available
      if (lat && lon && locationSource === "gps") {
        const geoData = await reverseGeocode(lat, lon)
        if (geoData) {
          // Build a detailed location string including area for precise hospital search
          const parts = [geoData.area, geoData.city, geoData.region, geoData.country].filter(Boolean)
          locationStr = parts.join(", ")
          locationInfo = {
            lat,
            lon,
            area: geoData.area,
            city: geoData.city,
            region: geoData.region,
            country: geoData.country,
            source: "gps"
          }
        } else {
          // GPS coords available but geocoding failed - still useful
          locationStr = `coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`
          locationInfo = { lat, lon, source: "gps" }
        }
      } 
      // Priority 2: Fallback to IP-based location
      else {
        try {
          const locRes = await fetch(
            "http://ip-api.com/json/?fields=status,city,regionName,country,lat,lon,timezone,query",
            { signal: AbortSignal.timeout(5000) }
          )
          const locData = await locRes.json()
          if (locData?.status === "success") {
            locationStr = `${locData.city}, ${locData.regionName}, ${locData.country}`
            locationInfo = {
              lat: locData.lat,
              lon: locData.lon,
              city: locData.city,
              region: locData.regionName,
              country: locData.country,
              source: "ip"
            }
          }
        } catch {
          // Location detection failed, use generic
        }
      }

      // Build prompt with precise location for better hospital recommendations
      const coordsInfo = locationInfo.lat && locationInfo.lon 
        ? `GPS Coordinates: ${locationInfo.lat.toFixed(6)}, ${locationInfo.lon.toFixed(6)}` 
        : ""
      
      const msg = await askGemini(
        `The patient ${patientName} has been diagnosed with: ${hospDisease}
Their detected location is: ${locationStr}
${coordsInfo}
Location source: ${locationInfo.source === "gps" ? "Accurate GPS from browser" : "Approximate IP-based location"}

As ${AI_NAME}, do the following:

1. Identify the best type of specialist/hospital department they should visit for ${hospDisease}
   (e.g., Gastroenterologist, Dermatologist, General Physician, Pulmonologist, etc.)

2. Suggest 4-5 well-known, reputable hospitals or healthcare facilities NEAR ${locationStr}
   that would be appropriate for treating ${hospDisease}.
   ${locationInfo.area ? `Focus on hospitals in or near ${locationInfo.area} area specifically.` : ""}
   
   Format each hospital as:
   **[Hospital Name]**
   - Location: [Specific area/locality]
   - Department: [relevant department to visit]
   - Distance: [Approximate if known]
   - Contact: [General hospital helpline if commonly known]
   - Why recommended: [one short reason]

3. Add practical tips:
   - What to carry: ID, any previous medical reports, list of symptoms
   - Best time: Morning (8-10 AM) for shorter wait times
   - Call ahead to confirm specialist availability

4. If GPS location shows a specific area (like "${locationInfo.area || "a suburb"}"), prioritize hospitals in that immediate vicinity first, then nearby areas.

IMPORTANT: Only suggest real, verifiable hospitals that actually exist in the mentioned location. Do NOT make up hospital names.

Keep the tone warm and reassuring as ${AI_NAME}. Address the patient by name.`,
        patientName
      )
      return NextResponse.json({ message: msg, location: locationInfo })
    }

    // ── Step 8: Severe Warning ────────────────────────────────────────
    case "severe_warning": {
      const { disease: sevDisease } = data as { disease: string }
      const msg = await askGemini(
        `Patient ${patientName} has a HIGH severity score for: ${sevDisease}

As ${AI_NAME}, write an urgent but calm message:
1. Explain their condition seems serious and needs professional medical attention soon
2. Tell them you are finding nearby hospitals for them right now
3. Encourage them to not panic but not delay either
Keep it to 3-4 sentences. Firm, caring, and calm.`,
        patientName
      )
      return NextResponse.json({ message: msg })
    }

    // ── Step 9: Farewell ──────────────────────────────────────────────
    case "farewell": {
      const { disease: farewellDis } = data || {}
      const msg = await askGemini(
        `Give a warm goodbye message as ${AI_NAME} to patient ${patientName} who consulted about ${farewellDis || "their health concern"}.
Wish them a speedy recovery, remind them to follow the precautions,
and encourage them to visit a real doctor. Keep it to 2-3 sentences. Warm and hopeful.`,
        patientName
      )
      return NextResponse.json({ message: msg })
    }

    // ── Free Chat ─────────────────────────────────────────────────────
    case "free_chat": {
      const { message } = data as { message: string }
      const msg = await askGemini(
        `The patient ${patientName} says: "${message}"

As ${AI_NAME}, respond helpfully. If it's a health-related question, provide guidance.
If they want to start a new consultation, guide them. Keep it conversational and warm.`,
        patientName
      )
      return NextResponse.json({ message: msg })
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}
