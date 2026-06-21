# Product Specification: "Tengo Derechos"

This Product Requirements Document (PRD) defines the features, user flows, and interface specifications for the **Tengo Derechos** mobile application.

---

## 1. Objectives & Target Audience
* **Objective**: Provide Mexican citizens and residents with quick, understandable, and officially cited access to their civil, constitutional, and regulatory rights.
* **Target Audience**: Everyday people who face legal doubts (e.g., traffic stops, family law questions, consumer rights disputes, labor issues) but do not have formal legal training.
* **Scope**: Starting with Federal Laws and Mexico City (CDMX) state codes, designed to scale to all 32 Mexican states.

---

## 2. Key Features & User Stories

### A. Quick Anonymous Search
* **User Story**: As an unauthenticated user, I want to type a question about my rights on the home screen and get an immediate answer so that I don't face the friction of creating an account for a quick check.
* **Requirements**:
  - The home search screen must load instantly without login walls.
  - RAG-powered answers must cite specific articles from Mexican law.

### B. State-Specific & Location-Aware Search
* **User Story**: As a user in Mexico, I want the app to identify my state (or let me choose manually) so that search results cite my local state codes (e.g., civil code, penal code, transit regulation) rather than another state's laws.
* **Requirements**:
  - Request OS permission for location access on first search or via onboarding.
  - If location access is denied, fallback to CDMX or default to a manual state selection dropdown.
  - Display search results based on the resolved jurisdiction.

### C. Multimedia Legality Queries ("Is this legal?")
* **User Story**: As an authenticated user, I want to take a photo or upload a short video showing an incident (e.g., a police officer demanding a bribe, a car crash scene, a public space restriction) and ask "is this legal?" to receive legal analysis.
* **Requirements**:
  - Require authentication (Login/Signup) before enabling media upload.
  - Request OS camera and photo library permissions on demand.
  - Privacy Filter: The app backend must strip metadata (EXIF/GPS) and blur sensitive identifiers (faces, license plates) before storing files publicly, to comply with the *Ley Federal de Protección de Datos Personales en Posesión de los Particulares*.

### D. User Authentication & Profile
* **User Story**: As a registered user, I want to log in using my email/password so that my search history, uploaded media, and saved articles are synced across devices.
* **Requirements**:
  - Basic login/registration flows.
  - "Delete Account" option to satisfy Apple App Store and Google Play privacy requirements.

---

## 3. UI/UX Flow & Wireframes

### Screen 1: Home / Search Screen
* **Layout**:
  - **Header**: App logo ("Tengo Derechos") and a Profile/Login icon (top right).
  - **Search Area**: Centered text input mimicking a clean search engine interface. A "Search" button.
  - **Location Bar**: Small badge showing current state jurisdiction (e.g., "📍 Ciudad de México" or "📍 Jalisco") with an "Edit" button to change manually.
  - **Trending Section**: Underneath the search bar, a grid displaying the "Most Popular Queries" (e.g., *"¿Qué hacer si choco por detrás?"*, *"Obligaciones de pensión alimenticia"*, *"Derechos ante una detención policial"*). Tapping a popular query auto-submits it.
  - **Bottom Nav**: Home, Upload Case (disabled for anonymous), Saved (disabled for anonymous), Settings.

### Screen 2: Search Results Screen
* **Layout**:
  - **Query Header**: Re-displays the user's question with a back button.
  - **AI Answer Card**: Plain-language explanation of rights/duties. Written in simple terms, avoiding dense legalese.
  - **Official Citations Section**: A list of expandable cards. Each card displays:
    - Code Name (e.g., *Código Civil Federal*, *Reglamento de Tránsito de la CDMX*).
    - Article Number (e.g., *Artículo 135*).
    - Excerpt: The exact text of the article.
  - **Feedback & Actions**: "Save to My Rights" bookmark icon, "Share" button, and "Incorrect Answer?" report flag.

### Screen 3: Login / Signup Screen
* **Layout**:
  - Title: "Crea tu cuenta / Inicia sesión"
  - Form Fields: Email address, Password.
  - CTA Button: "Entrar" (Login) or "Registrarse" (Register).
  - An option to "Continue as Guest" to return to the home screen.

### Screen 4: Multimedia Upload & Analysis ("Pregunta con Multimedia")
* **Layout**:
  - **Permission Check**: If permissions aren't granted, displays a card: *"Necesitamos acceso a tu cámara para continuar"* with an "Enable" button.
  - **Upload Box**: Drag-and-drop or tap-to-select area for photos/videos. Previews the selected image or video thumbnail.
  - **Context Input**: Text box: *"Describe la situación (opcional)"* for the user to provide context.
  - **Submit Button**: "Analizar Video/Foto".
  - **Analysis Progress**: Displays a progress indicator with steps (e.g., "Stripping metadata...", "Blurring faces...", "Analyzing legality...").

### Screen 5: Saved Rights & History Screen (Authenticated Only)
* **Layout**:
  - Tabs: "Saved Rights" and "My Cases/Media".
  - List view of bookmarked legal queries and previous multimedia analysis reports.

### Screen 6: Settings Screen
* **Layout**:
  - Manual State Selector (List of the 32 Mexican states).
  - Account info (Email, change password, delete account).
  - Legal disclaimers: **"Esta aplicación no sustituye la asesoría de un abogado profesional. La información es únicamente informativa."** (Disclaimers must be highly visible).

---

## 4. Compliance & Security Requirements
1. **Legal Disclaimer**: A mandatory terms-of-service agreement and permanent footer disclaimers specifying that the app provides legal *information*, not legal *representation* or *counsel*.
2. **Data Retention**: Allow users to clear search history and delete uploaded media instantly.
3. **App Store Guidelines**: Ensure strict implementation of App Store guideline 5.1.1 (Data Collection and Storage) and 1.2 (User Generated Content - UGC moderation if media is ever shared publicly, though in v1 it is private).
