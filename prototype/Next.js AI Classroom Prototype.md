

# **AI Tutor Prototype: A Next.js and Vertex AI Technical Blueprint**

## **Part I: Foundational Architecture & Technology Stack**

This section establishes the strategic technology choices for the prototype, forming the bedrock of the application. The decisions made here are informed by the latest ecosystem trends as of July 2025, prioritizing developer experience, performance, and scalability. The pivot from a Google-centric Angular stack to a Next.js-based architecture is a deliberate choice, driven by the unique advantages the modern React ecosystem offers for building highly interactive, full-stack applications with a small, agile team.

### **1.1 The Core Framework: Next.js 15 with the App Router**

The foundational framework for this AI Tutor prototype will be **Next.js**, specifically version 15.2.x or later. This version represents a mature and stable implementation of the App Router paradigm, built upon the stable release of React 19\.1 This choice provides immediate access to a suite of cutting-edge features that are not merely incremental improvements but fundamental shifts in how web applications are built. These features—React Server Components, Server Actions, and Dynamic HTML Streaming—are perfectly suited for the demands of a modern, AI-driven educational platform.2

The App Router's file-based routing system is inherently intuitive, allowing the application's structure to be understood directly from the filesystem layout.3 This approach minimizes configuration boilerplate and scales elegantly as new features and routes are added.

**Key Features to Leverage:**

* **React Server Components (RSCs):** By default, components within the app directory are Server Components. This is a cornerstone of our architecture. It allows us to perform data fetching and execute sensitive server-side logic—such as making authenticated calls to the Vertex AI SDK—directly within the component that needs the data. The crucial benefit is that this server-side code is never sent to the client, resulting in a significantly smaller JavaScript bundle and enhanced security.  
* **Dynamic HTML Streaming with React Suspense:** This combination is critical for achieving excellent perceived performance. When a user navigates to the classroom, the server will immediately stream the static parts of the UI (the shell, the layout, buttons) to the browser. Meanwhile, any components that are waiting for data, such as the AI's initial greeting or the content of the PDF, can be wrapped in a \<Suspense\> boundary. The user sees an interactive application shell almost instantly, with loading states gracefully handled where data is still being fetched. This eliminates the "all-or-nothing" loading spinner common in older Single-Page Applications (SPAs).2  
* **Built-in Optimizations:** The Next.js framework provides a suite of automatic optimization components that will be used to ensure excellent Core Web Vitals scores from the outset. The next/image component handles automatic image resizing, format optimization (serving modern formats like WebP), and lazy loading. Similarly, next/font optimizes font loading to prevent layout shifts, and next/script provides fine-grained control over when third-party scripts are loaded and executed.2

The adoption of the Next.js 15 App Router signifies a move beyond the traditional dichotomy of Multi-Page Applications (MPAs) versus Single-Page Applications (SPAs). Historically, developers faced a trade-off: the fast initial page loads and strong SEO of MPAs, or the fluid, app-like client-side interactivity of SPAs. The modern Next.js architecture effectively merges the benefits of both.2 An initial request to a route serves a fully-rendered, SEO-friendly HTML shell, just like a classic MPA. However, subsequent navigation and interactions are handled client-side, with the framework intelligently fetching only the necessary data and components, providing the smooth experience of a SPA. This hybrid model is a strategic advantage, allowing us to build an application that feels both incredibly fast on initial load and highly responsive during use. The architecture will be designed to explicitly leverage this model, using Server Components for the main layout and data-intensive sections, while designating specific interactive pieces, like the chat input form, as Client Components.

### **1.2 The UI Foundation: shadcn/ui, Radix UI, and Tailwind CSS**

For the user interface, this project will eschew traditional, monolithic component libraries in favor of the modern, flexible methodology offered by **shadcn/ui**. It is critical to understand that shadcn/ui is not a dependency installed from npm in the typical sense; it is a CLI tool that installs the *source code* of beautifully designed, accessible components directly into the project's codebase.4 This approach provides maximum ownership, customizability, and transparency.

**The Stack within the Stack:**

This UI strategy is composed of three synergistic layers:

1. **Radix UI Primitives:** At the lowest level, shadcn/ui components are built upon the unstyled, headless primitives from **Radix UI**. Radix is responsible for handling all the complex, low-level accessibility and behavior logic. This means that components like Dialogs, Dropdown Menus, and Toggles come with best-in-class accessibility features—including WAI-ARIA compliance, full keyboard navigation, and proper focus management—out of the box, without any additional effort from the development team.7  
2. **Tailwind CSS:** All styling is handled via **Tailwind CSS**, a utility-first framework that allows for rapid development by composing styles directly in the markup. Its seamless integration with the Next.js ecosystem and its highly customizable nature make it the ideal choice for styling the components provided by shadcn/ui.9  
3. **shadcn/ui:** This is the tool that brings it all together. When a developer runs a command like pnpm dlx shadcn@latest add button, the CLI copies a button.tsx file—which is pre-styled with Tailwind CSS and built on Radix primitives—into the /components/ui directory.6

This model represents a fundamental shift in the developer's relationship with their UI library, moving from *using* a library to *owning* it. In a traditional model, customizing a component from a library like Material-UI or Ant Design often involves fighting with CSS specificity, writing style overrides, or wrapping components in higher-order components. This can lead to brittle code and technical debt. With the shadcn/ui approach, if a change is needed for the Button component, the developer simply opens components/ui/button.tsx and edits the source code directly. This eliminates vendor lock-in, makes debugging trivial, and empowers the team to evolve a truly bespoke design system over time from a solid, well-designed foundation. For a prototype that will inevitably undergo significant iteration, this flexibility is a decisive advantage.

### **1.3 The Backend Paradigm: Server Actions First**

For all client-to-server data mutations—such as submitting a chat message to the AI or uploading the PDF textbook—this project will adopt **Next.js Server Actions** as the default architectural pattern. Server Actions are functions, marked with the "use server"; directive, that are guaranteed to execute only on the server. They can be called directly from React components, typically via a form's action prop, which drastically simplifies the architecture by co-locating the mutation logic with the UI that triggers it.11

While Next.js still supports traditional API Route Handlers (e.g., files in /app/api/...), their use will be reserved for specific scenarios that fall outside the scope of what Server Actions are designed for. For this prototype, **we will exclusively use Server Actions.** This "Server Actions First" policy streamlines development and reduces boilerplate, as there is no need to manually create API endpoints, handle HTTP methods, or write data-fetching code to call those endpoints.11

To ensure architectural clarity for future development, the following decision matrix codifies the appropriate use case for each pattern.

| Use Case | Recommended Pattern | Rationale |
| :---- | :---- | :---- |
| Form Submissions (Chat, File Upload) | **Server Action** | Tightly coupled with the UI, this pattern reduces boilerplate, simplifies state management, and enables progressive enhancement out of the box. The form works even with JavaScript disabled. |
| AI Chat Interaction | **Server Action** | Provides a secure, server-only environment to call the Vertex AI SDK. It can directly return a stream of data from the AI, which the Next.js framework can pipe to the client for a real-time "typing" effect. |
| Exposing a REST/GraphQL API | **API Route Handler** | When the application needs to provide a stable, versionable endpoint for consumption by external clients (e.g., a mobile app, a third-party service), API Routes are the correct tool.12 |
| Receiving Webhooks | **API Route Handler** | This is the standard pattern for handling incoming HTTP requests from third-party services (e.g., Stripe, GitHub) that expect a specific URL endpoint to post data to.13 |
| Simple Data Fetching (Read-only) | **React Server Component** | For read operations, neither pattern is needed. Data should be fetched directly within a Server Component where it is used, eliminating the need for any separate endpoint.2 |

### **1.4 State Management: A Pragmatic Approach with Zustand**

The modern Next.js architecture fundamentally bifurcates the concept of application state. "Server state," which includes data fetched from databases or APIs (like the AI's responses or the parsed PDF content), is best managed by the framework itself through the lifecycle of Server Components and the URL. Attempting to synchronize this server data into a client-side store is now an anti-pattern that introduces unnecessary complexity and potential for state mismatches.

For the remaining "client state"—ephemeral UI state that the server does not need to be aware of, such as input field values, loading spinner visibility, or whether a modal is open—a lightweight client-side solution is required. For this purpose, we will use **Zustand**.

Zustand is a minimal, fast, and scalable state management library that is perfectly suited for this role.14 Its primary advantage is its simplicity and its provider-less API. Unlike other libraries such as Redux or even Jotai, Zustand does not require wrapping the application in a

\<Provider\> component.14 A Zustand store is created as a simple hook, which can then be used in any client component to subscribe to state changes, feeling much like a globally accessible

useState.17 This approach avoids component tree nesting and keeps the setup clean and straightforward.

While Jotai is another excellent atomic state management library, its requirement for a root \<Provider\> adds a small layer of boilerplate that is unnecessary for the focused needs of this prototype.16 Zustand's "drop-in" nature makes it the more pragmatic choice.

Our application code will strictly adhere to this separation of concerns. AI-generated content will be rendered by Server Components and passed down as props or streamed directly to the client. Zustand will be used exclusively for managing the client-side state of interactive UI elements, such as the isSubmitting state of the chat input form.

### **1.5 AI Integration: Securely Connecting to Vertex AI**

The connection to Google's generative AI services must be handled with security as the highest priority. All interactions with the Gemini models will occur exclusively on the server. We will use the official **@google/genai** SDK, which is Google's most up-to-date and recommended library for interacting with Gemini models on both the Gemini API and Vertex AI platforms.19

Authentication will be managed via a **Google Cloud Service Account** and the standard **Application Default Credentials (ADC)** mechanism. This is the secure, industry-standard approach for server-to-server authentication within the Google Cloud ecosystem. It completely avoids the need to handle API keys or other secrets in the application code and, most importantly, prevents any credentials from ever being exposed to the client-side browser environment.19

In practice, this means the service account's JSON key file will be made available to the application's server environment (e.g., via the GOOGLE\_APPLICATION\_CREDENTIALS environment variable). The @google/genai SDK, when initialized on the server, will automatically detect and use these credentials for authentication. The SDK will be instantiated in a dedicated, server-only utility file, configured to use the Vertex AI backend by setting the vertexai: true flag and providing the project ID and location.19

### **1.6 Final Technology Stack Summary**

The following table provides a consolidated view of all technologies, libraries, and tools selected for this prototype, serving as a quick-reference blueprint for the development team.

| Category | Technology/Library | Version (as of July 2025\) | Justification |
| :---- | :---- | :---- | :---- |
| Core Framework | Next.js | v15.2.x | App Router, RSCs, Server Actions, and Streaming for modern, performant, full-stack development.1 |
| UI Library | React | v19.x | The foundational UI library, providing stable support for the use hook and the Actions paradigm that powers Server Actions.1 |
| UI Components | shadcn/ui | Latest | A CLI-based component generator that provides source-code ownership, enabling maximum customizability and long-term flexibility.4 |
| UI Primitives | Radix UI | Latest | Provides the unstyled, fully accessible, and behaviorally robust foundation for all shadcn/ui components.7 |
| Styling | Tailwind CSS | v4.x | A utility-first CSS framework that enables rapid, consistent, and maintainable styling directly in the markup.10 |
| Client State | Zustand | v4.5.x | A minimal, provider-less, hook-based state management library for handling ephemeral UI state without unnecessary boilerplate.14 |
| AI SDK | @google/genai | Latest | The official and modern Google SDK for Gemini/Vertex AI, supporting secure, server-side authentication via ADC.19 |
| PDF Parsing | pdf-parse | v1.1.x | A robust, pure-JavaScript, server-side library for extracting text content from PDF buffers, ideal for processing file uploads.20 |
| PDF Rendering | pdf.js (via pdfjs-dist) | v4.4.x | Mozilla's de facto standard for high-fidelity, in-browser PDF rendering, ensuring accurate visual representation of the source material.22 |
| Language | TypeScript | v5.5.x | Essential for building scalable and maintainable applications, providing robust type safety and an enhanced developer experience. |
| Package Manager | pnpm | v9.x | A fast and disk-space-efficient package manager that is well-suited for modern monorepo and single-package development. |

---

## **Part II: Prescriptive Project Structure & Organization**

This section provides a concrete, hierarchical file and folder structure for the Next.js 15 application. This structure is not arbitrary; it is designed for maximum clarity, scalability, and a clean separation of concerns, reflecting the modern paradigms introduced by the App Router. Adhering to this structure will ensure that the codebase remains maintainable and intuitive as the project grows.

### **2.1 The Anatomy of the Application Root**

The following diagram illustrates the prescribed top-level directory and file structure for the prototype. Each element has a distinct and well-defined purpose within the architecture.

.  
├── /app/                      \# App Router: All routes, pages, and layouts  
│   ├── /api/                  \# (Reserved) For webhook handlers or external-facing APIs  
│   ├── /classroom/\[chapterId\]/ \# Dynamic route for the interactive classroom  
│   │   └── page.tsx           \# The main Classroom page (React Server Component)  
│   ├── layout.tsx             \# Root layout component (Server Component)  
│   └── page.tsx               \# Application homepage (Server Component)  
├── /components/               \# Reusable React Components  
│   ├── /ui/                   \# Primitive UI components installed by shadcn/ui  
│   └── /shared/               \# Custom, composite components built for the application  
├── /hooks/                    \# Custom React hooks for client-side logic  
│   └── use-chat-scroll.ts     \# Example: Hook to manage scroll behavior of the chat window  
├── /lib/                      \# Core application logic, utilities, and SDKs  
│   ├── ai.ts                  \# Vertex AI SDK initialization and helper functions (server-only)  
│   ├── actions.ts             \# Server Action definitions (marked with "use server")  
│   └── utils.ts               \# General utility functions (e.g., cn() for Tailwind CSS)  
├── /public/                   \# Static assets accessible from the browser  
│   ├── /images/               \# Application images, logos, etc.  
│   └── pdf.worker.min.mjs     \# The required web worker for pdf.js  
├── /styles/                   \# Global CSS files  
│   └── globals.css            \# Tailwind CSS directives and global style definitions  
├──.env.local                 \# Local environment variables (NEVER commit to Git)  
├──.gitignore                 \# Specifies files and directories to be ignored by Git  
├── next.config.mjs            \# Next.js configuration file  
├── package.json               \# Project metadata and dependencies  
├── postcss.config.mjs         \# PostCSS configuration (for Tailwind CSS)  
├── tailwind.config.ts         \# Tailwind CSS theme and plugin configuration  
└── tsconfig.json              \# TypeScript compiler configuration

### **2.2 Component Architecture Philosophy**

A disciplined approach to component organization is crucial for maintainability. The /components directory is divided into two distinct subdirectories, each with a clear purpose.

* **/components/ui/**: This directory is considered to be managed by the shadcn/ui CLI.6 It will contain the raw source code for primitive, general-purpose components such as  
  button.tsx, card.tsx, input.tsx, scroll-area.tsx, and dialog.tsx. Developers should treat these as the foundational building blocks of the application's design system. While they can be modified to meet project-specific styling requirements, they should remain generic and reusable.  
* **/components/shared/**: This directory is where the application's custom, composite components reside. These components are specific to the AI Tutor's domain and are assembled using the primitives from /components/ui/. They often contain business logic and are tailored to a specific feature. For this prototype, this directory will contain:  
  * **PDFViewer.tsx**: A client component responsible for encapsulating the pdf.js library logic to render the PDF onto a canvas.  
  * **ChatWindow.tsx**: A client component that orchestrates the overall chat interface, using the ScrollArea primitive to display a list of ChatMessage components.  
  * **ChatInput.tsx**: A client component containing the \<form\> element for user input, which will invoke a Server Action on submission.  
  * **ChatMessage.tsx**: A presentational component for displaying a single message in the chat, using Avatar and Card primitives.

### **2.3 Logic and Utilities Organization**

Separating non-UI logic into the /lib directory ensures a clean architecture where concerns are properly isolated.

* **/lib/ai.ts**: This is a **server-only** module. It is fundamentally important for security that this file is never imported into a client component. It will contain the initialization logic for the @google/genai SDK, reading credentials securely from the server's environment. All functions that directly wrap calls to the Vertex AI API (e.g., getGenerativeModel) will be defined here.  
* **/lib/actions.ts**: This file must begin with the "use server"; directive at the very top. It will serve as the central repository for all Server Action definitions for the application. For the prototype, this will include submitMessageToAI(formData) and uploadAndProcessPDF(formData). Co-locating actions here makes them easy to find, manage, and import into the client components that call them.  
* **/hooks/**: This directory is for purely client-side logic that is encapsulated into reusable React hooks. These hooks help manage complex UI behavior without cluttering the components themselves. A prime example for this project would be use-chat-scroll.ts, a custom hook that takes a ref to the chat container and automatically scrolls it to the bottom whenever new messages are added.

---

## **Part III: Core Feature Implementation: The Interactive Classroom**

This section provides a detailed, step-by-step implementation guide for the prototype's core functionality: ingesting a PDF textbook and delivering a single chapter through an interactive, AI-powered chat interface.

### **3.1 The PDF Ingestion and Processing Pipeline**

The first step is to get the textbook content into a format the AI can understand. This process is handled entirely on the server for security and performance.

* **Step 1: File Upload UI (Client-Side)**  
  * A simple setup page (e.g., /setup) will be created. This page will contain a standard HTML \<form\>.  
  * The form will include an \<input type="file" accept=".pdf" /\> and a submit button.  
  * Crucially, the \<form\> element's action attribute will be bound directly to a Server Action, uploadAndProcessPDF, which is imported from /lib/actions.ts. This modern approach eliminates the need for manual onSubmit handlers, state management for the file object, and fetch calls.  
* **Step 2: The uploadAndProcessPDF Server Action (/lib/actions.ts)**  
  * This asynchronous function will be defined in /lib/actions.ts and marked with "use server";. It will automatically receive the FormData object from the client-side form submission.  
  * Inside the action, the code will retrieve the uploaded file from the FormData object.  
  * The file will be read into a Buffer using file.arrayBuffer().  
  * This buffer is then passed to the pdf-parse library, which will be called to extract the raw text content from the entire PDF document.20  
  * **Core Prototype Logic:** For the purpose of this prototype, the action will implement a simple text-parsing strategy to divide the extracted text into "chapters." This can be achieved by splitting the text string using a regular expression that looks for patterns like "Chapter 1", "Chapter 2", etc.  
  * The resulting array of chapter strings will be stored in a simple server-side cache or a temporary JSON file on the server's filesystem. A unique identifier for this processed document will be generated.  
  * Finally, the Server Action will use the redirect() function from next/navigation to send the user to the classroom view for the first chapter, e.g., /classroom/chapter-1.

### **3.2 The Classroom View (/app/classroom/\[chapterId\]/page.tsx)**

This is the main interactive screen for the user. It will be a dynamic route that renders the content for a specific chapter.

* **Layout:** The page will be structured as a two-pane layout using CSS Flexbox or Grid.  
  * **Left Pane (approx. 70% width):** This area will be occupied by the PDFViewer component, providing the student with a visual reference of the original textbook page.  
  * **Right Pane (approx. 30% width):** This area will contain the ChatWindow component, which is the primary interface for interacting with the AI tutor.  
* **Data Fetching (Server-Side):** The page.tsx file itself is a React Server Component. It will receive params as a prop, containing { chapterId: '...' }. It will use this ID to fetch the pre-processed text for the corresponding chapter from the server-side cache/file created in the ingestion step. This chapter text is the crucial context that will be used to ground the AI's responses.  
* **Component Breakdown:**  
  * **PDFViewer.tsx ("use client";)**: This client component is responsible for rendering the visual PDF. It will receive the PDF file's URL as a prop. It will use the useEffect hook to initialize the pdf.js library.22 A critical configuration step is to set the  
    workerSrc to point to the worker script that must be copied into the /public directory during the build process: /public/pdf.worker.min.mjs.22 The component will then render the appropriate page of the PDF onto an HTML  
    \<canvas\> element.  
  * **ChatWindow.tsx ("use client";)**: This is the main orchestrator for the chat UI. It will manage an array of chat messages (e.g., { id: string, role: 'user' | 'assistant', content: string }). For this prototype, this state will be managed within a Zustand store to facilitate communication between the chat display and the chat input. It will use shadcn/ui components to build its interface and will contain the ChatInput component at the bottom.

To provide a clear inventory for the UI developer, the following table maps the required visual elements to their source and function.

| Component Name | Source | Function |
| :---- | :---- | :---- |
| Card | shadcn/ui | Used to frame the main chat window and to visually encapsulate individual chat messages, providing structure and separation. |
| ScrollArea | shadcn/ui | A crucial component for creating a scrollable container for the chat history, ensuring the input remains visible as the conversation grows. |
| Input | shadcn/ui | The primary text input field where the user will type their questions and responses to the AI tutor. |
| Button | shadcn/ui | The "Send" button for the chat input form, which triggers the submission of the Server Action. |
| Avatar | shadcn/ui | Used to display simple icons representing the user and the AI assistant next to each message, improving conversation readability. |
| PDFViewer.tsx | Custom (/components/shared/) | A custom client component that wraps all the logic for rendering the PDF via pdf.js, isolating this complexity. |
| ChatWindow.tsx | Custom (/components/shared/) | The main composite client component that assembles the chat UI from the primitive components listed above. |

### **3.3 The AI Interaction Loop**

This loop describes the flow of data from the user's input to the AI and back, leveraging the modern features of Next.js 15\.

* **Step 1: Secure SDK Initialization (/lib/ai.ts)**  
  * This server-only module will contain the code to initialize the @google/genai SDK. It will be configured for Vertex AI and will pull the necessary GCP\_PROJECT\_ID and GCP\_PROJECT\_LOCATION from process.env. This ensures no sensitive configuration is ever exposed to the client. The initialization will happen once and the client instance will be exported for use in Server Actions.  
* **Step 2: The submitMessageToAI Server Action (/lib/actions.ts)**  
  * This action is the core of the server-side logic. It will be called by the ChatInput form's action prop.  
  * It will accept the current conversation history and the new user message as arguments.  
  * It will import the initialized AI client from /lib/ai.ts.  
  * It will construct a prompt for the Gemini model (e.g., gemini-1.5-flash-001). This prompt is critical: it must include the full text of the current textbook chapter as context, the entire conversation history, and the new user question. This "grounding" ensures the AI's responses are relevant to the learning material.  
  * It will then call the AI SDK's streaming method, for example: ai.getGenerativeModel(...).generateContentStream(...).  
* **Step 3: Streaming the Response to the Client**  
  * A key feature of Server Actions in Next.js 15 is their ability to return a ReadableStream. The framework handles the complex task of piping this stream from the server to the client.  
  * On the client-side, in the ChatWindow.tsx component, we will use the useOptimistic hook from React 19\. This allows the UI to be updated instantly with the user's message, providing immediate feedback without waiting for the server roundtrip.  
  * The AI's response, arriving as a stream, will be read and appended to the UI token by token. This creates the familiar "live typing" effect seen in modern AI chatbots, significantly enhancing the user experience and making the interaction feel conversational and immediate.

---

## **Part IV: Mandatory Patterns, Practices, and Pitfalls**

This final section serves as a developer's handbook for building the prototype. Adherence to these patterns and avoidance of common pitfalls will ensure a high-quality, secure, and maintainable codebase that correctly utilizes the features of Next.js 15\.

### **4.1 Prescriptive "Do's" (Best Practices)**

* **DO** use Server Actions for all data mutations (create, update, delete operations). This is the canonical pattern in the App Router for UI-driven server-side logic.  
* **DO** keep all AI SDK initialization and direct API calls strictly on the server, within server-only modules like /lib/ai.ts and Server Actions in /lib/actions.ts.  
* **DO** manage all secrets (service account details, API keys) and environment-specific configuration using environment variables (.env.local for development) and the hosting platform's secret management for production. Never hardcode credentials.  
* **DO** use the useFormState and useFormStatus hooks from React DOM. They are designed to work with Server Actions to handle pending states (e.g., disabling a button while the AI is responding) and display form-related errors gracefully, enabling progressive enhancement.  
* **DO** structure components with a clear separation of concerns. Use "smart" Server Components to fetch data and perform server logic, and pass that data as props to "dumb" Client Components that are responsible only for handling user interaction and presenting the UI.  
* **DO** leverage React Suspense and loading UI files (loading.tsx) to handle loading states declaratively. This provides a better user experience than manual loading spinners and integrates natively with the framework's streaming capabilities.

### **4.2 Critical "Don'ts" (Pitfalls to Avoid)**

* **DON'T** import any module containing server-only code (like the file that initializes the AI SDK) into a component marked with the "use client"; directive. This will result in a build-time error, as the framework enforces this boundary to prevent server secrets from leaking to the client.  
* **DON'T** attempt to pass functions (including event handlers) as props from a Server Component to a Client Component. This is not allowed in the RSC architecture. The correct pattern is to pass a Server Component *as a child* to a Client Component (e.g., passing a server-rendered element into a client-side modal).  
* **DON'T** create an API Route Handler in /app/api just to fetch data from it within a Server Component. This is a redundant and inefficient pattern. Fetch the data directly within the body of the Server Component itself.  
* **DON'T** store large, non-serializable data, such as file buffers or complex class instances, in client-side state (e.g., with useState or Zustand). This data should be processed and handled on the server. Only serializable data should be passed from server to client.  
* **DON'T** ever place your service account JSON key file in the /public directory or commit it to version control. It must be added to .gitignore immediately. Access it securely through environment variables.

### **4.3 Key Code Patterns in Detail**

The following code snippets provide complete, copy-pasteable examples of the most critical patterns required for this prototype.

#### **Secure Vertex AI Initialization (/lib/ai.ts)**

This module initializes the Google AI client in a secure, server-only context.

TypeScript

// /lib/ai.ts  
// This file is server-only. DO NOT import it into any client component.

import { GoogleGenAI } from '@google/genai';

// Ensure required environment variables are set  
if (\!process.env.GCP\_PROJECT\_ID ||\!process.env.GCP\_PROJECT\_LOCATION) {  
  throw new Error(  
    'GCP\_PROJECT\_ID and GCP\_PROJECT\_LOCATION environment variables are not set.'  
  );  
}

// Initialize the GoogleGenAI client for Vertex AI.  
// The SDK will automatically use Application Default Credentials  
// if the GOOGLE\_APPLICATION\_CREDENTIALS environment variable is set.  
const aiClient \= new GoogleGenAI({  
  vertexai: true,  
  project: process.env.GCP\_PROJECT\_ID,  
  location: process.env.GCP\_PROJECT\_LOCATION,  
});

// Export a helper function to get a specific generative model  
export const getGenerativeModel \= (modelName: string \= 'gemini-1.5-flash-001') \=\> {  
  return aiClient.getGenerativeModel({ model: modelName });  
};

#### **Streaming Server Action (/lib/actions.ts)**

This demonstrates the submitMessageToAI action, which takes conversation history and user input, calls the AI, and streams the response.

TypeScript

// /lib/actions.ts  
'use server';

import { streamText } from 'ai';  
import { getGenerativeModel } from './ai';  
import { CoreMessage } from 'ai';

export async function submitMessageToAI(  
  chapterContext: string,  
  messages: CoreMessage  
) {  
  // Construct a system prompt to ground the AI  
  const systemPrompt \= \`You are an expert tutor. Your goal is to help a student understand the provided textbook chapter.  
  All of your answers must be based \*only\* on the content of the chapter provided below.  
  Do not use any external knowledge. Be encouraging and clear.

  \--- TEXTBOOK CHAPTER START \---  
  ${chapterContext}  
  \--- TEXTBOOK CHAPTER END \---  
  \`;

  const model \= getGenerativeModel('gemini-1.5-flash-001');

  const result \= await streamText({  
    model: model,  
    system: systemPrompt,  
    messages,  
  });

  // The 'ai' package Vercel SDK handles creating the stream  
  return result.toAIStream();  
}

#### **Client-Side Hook for Web Speech API (/hooks/use-speech-recognition.ts)**

While the primary prototype is text-based, providing a clear path for future audio features adds significant value. This custom hook encapsulates the complexity of the Web Speech API, making it trivial to add "speech-to-text" functionality to any client component. It is based on the MDN documentation.23

TypeScript

// /hooks/use-speech-recognition.ts  
'use client';

import { useState, useEffect, useRef } from 'react';

// Define the shape of the returned object  
interface SpeechRecognitionHook {  
  transcript: string;  
  isListening: boolean;  
  startListening: () \=\> void;  
  stopListening: () \=\> void;  
  error: string | null;  
  isSupported: boolean;  
}

export function useSpeechRecognition(): SpeechRecognitionHook {  
  const \= useState('');  
  const \[isListening, setIsListening\] \= useState(false);  
  const \[error, setError\] \= useState\<string | null\>(null);  
  const recognitionRef \= useRef\<SpeechRecognition | null\>(null);

  useEffect(() \=\> {  
    // Check for browser support on component mount  
    const SpeechRecognition \= window.SpeechRecognition |

| window.webkitSpeechRecognition;  
    if (\!SpeechRecognition) {  
      setError('Web Speech API is not supported in this browser.');  
      return;  
    }

    const recognition \= new SpeechRecognition();  
    recognition.continuous \= false;  
    recognition.interimResults \= false;  
    recognition.lang \= 'en-US';

    recognition.onresult \= (event: SpeechRecognitionEvent) \=\> {  
      const currentTranscript \= event.results.transcript;  
      setTranscript(currentTranscript);  
      setError(null);  
    };

    recognition.onerror \= (event: SpeechRecognitionErrorEvent) \=\> {  
      setError(\`Speech recognition error: ${event.error}\`);  
    };

    recognition.onend \= () \=\> {  
      setIsListening(false);  
      setTranscript(''); // Reset transcript after listening stops  
    };

    recognitionRef.current \= recognition;

    // Cleanup function  
    return () \=\> {  
      recognition.stop();  
    };  
  },);

  const startListening \= () \=\> {  
    if (recognitionRef.current &&\!isListening) {  
      recognitionRef.current.start();  
      setIsListening(true);  
    }  
  };

  const stopListening \= () \=\> {  
    if (recognitionRef.current && isListening) {  
      recognitionRef.current.stop();  
      setIsListening(false);  
    }  
  };

  return {  
    transcript,  
    isListening,  
    startListening,  
    stopListening,  
    error,  
    isSupported: recognitionRef.current\!== null,  
  };  
}

#### **Works cited**

1. Next.js by Vercel \- The React Framework, accessed on July 28, 2025, [https://nextjs.org/blog](https://nextjs.org/blog)  
2. Next.js by Vercel \- The React Framework, accessed on July 28, 2025, [https://nextjs.org/](https://nextjs.org/)  
3. Why Use Next.js in 2025: Benefits and Use Cases \- Gautam IT Services, accessed on July 28, 2025, [https://www.gautamitservices.com/blogs/why-use-nextjs-in-2025-benefits-and-use-cases](https://www.gautamitservices.com/blogs/why-use-nextjs-in-2025-benefits-and-use-cases)  
4. Shadcn UI for Beginners: The Ultimate Step-by-Step Tutorial \- CodeParrot, accessed on July 28, 2025, [https://codeparrot.ai/blogs/shadcn-ui-for-beginners-the-ultimate-guide-and-step-by-step-tutorial](https://codeparrot.ai/blogs/shadcn-ui-for-beginners-the-ultimate-guide-and-step-by-step-tutorial)  
5. shadcn-ui/ui: A set of beautifully-designed, accessible components and a code distribution platform. Works with your favorite frameworks. Open Source. Open Code. \- GitHub, accessed on July 28, 2025, [https://github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)  
6. Introduction \- shadcn/ui, accessed on July 28, 2025, [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)  
7. Introduction – Radix Primitives, accessed on July 28, 2025, [https://www.radix-ui.com/primitives/docs/overview/introduction](https://www.radix-ui.com/primitives/docs/overview/introduction)  
8. Radix Primitives, accessed on July 28, 2025, [https://www.radix-ui.com/primitives](https://www.radix-ui.com/primitives)  
9. Syntax \- Tailwind CSS Documentation Template, accessed on July 28, 2025, [https://tailwindcss.com/plus/templates/syntax](https://tailwindcss.com/plus/templates/syntax)  
10. Framework guides \- Installation \- Tailwind CSS, accessed on July 28, 2025, [https://tailwindcss.com/docs/installation/framework-guides](https://tailwindcss.com/docs/installation/framework-guides)  
11. Next.js API Routes vs Server Actions: Which One Should You Use in 2025? \- useSAASkit, accessed on July 28, 2025, [https://www.usesaaskit.com/blog/next-js-api-routes-vs-server-actions-which-one-should-you-use-in-2025](https://www.usesaaskit.com/blog/next-js-api-routes-vs-server-actions-which-one-should-you-use-in-2025)  
12. Server actions vs API routes \- when to use what \[closed\] \- Stack Overflow, accessed on July 28, 2025, [https://stackoverflow.com/questions/79457679/server-actions-vs-api-routes-when-to-use-what](https://stackoverflow.com/questions/79457679/server-actions-vs-api-routes-when-to-use-what)  
13. Next.js Server Actions vs API Routes: The Final Answer for 2025 \- YouTube, accessed on July 28, 2025, [https://www.youtube.com/watch?v=NWx8oVLEdwE](https://www.youtube.com/watch?v=NWx8oVLEdwE)  
14. Zustand: Simplifying State Management in React E-commerce Applications, accessed on July 28, 2025, [https://www.pedroalonso.net/blog/react-state-management-zustand/](https://www.pedroalonso.net/blog/react-state-management-zustand/)  
15. React State Management — using Zustand | by Chikku George | Globant \- Medium, accessed on July 28, 2025, [https://medium.com/globant/react-state-management-b0c81e0cbbf3](https://medium.com/globant/react-state-management-b0c81e0cbbf3)  
16. Jotai: The Ultimate React State Management \- 100ms.live, accessed on July 28, 2025, [https://www.100ms.live/blog/jotai-react-state-management](https://www.100ms.live/blog/jotai-react-state-management)  
17. pmndrs/zustand: Bear necessities for state management in ... \- GitHub, accessed on July 28, 2025, [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)  
18. Jotai, primitive and flexible state management for React, accessed on July 28, 2025, [https://jotai.org/](https://jotai.org/)  
19. @google/genai, accessed on July 28, 2025, [https://googleapis.github.io/js-genai/](https://googleapis.github.io/js-genai/)  
20. pdf-parse | Compare Similar npm Packages, accessed on July 28, 2025, [https://npm-compare.com/pdf-parse](https://npm-compare.com/pdf-parse)  
21. pdf-parse \- npm, accessed on July 28, 2025, [https://www.npmjs.com/package/pdf-parse](https://www.npmjs.com/package/pdf-parse)  
22. Build a React PDF viewer with PDF.js and Next.js: Step-by-step tutorial \- Nutrient SDK, accessed on July 28, 2025, [https://www.nutrient.io/blog/how-to-build-a-reactjs-viewer-with-pdfjs/](https://www.nutrient.io/blog/how-to-build-a-reactjs-viewer-with-pdfjs/)  
23. Using the Web Speech API \- Web APIs | MDN, accessed on July 28, 2025, [https://developer.mozilla.org/en-US/docs/Web/API/Web\_Speech\_API/Using\_the\_Web\_Speech\_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)