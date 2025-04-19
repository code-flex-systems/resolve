# Manifest Checklist Platform

## 🧠 Overview

Manifest is a structured, schema-driven checklist application designed for reusability, strong typing, and advanced response querying. It allows users to build dynamic checklists composed of hierarchical pages, templated questions, and answer options — all backed by a normalized PostgreSQL schema.

## ✨ Features

### ✅ Checklists

-   Create and manage checklists.
-   Each checklist contains a tree of **page instances**.

### ✅ Pages

-   Two types: **Templates** and **Instances**.
-   Page templates define reusable question/answer layouts.
-   Page instances represent specific checklist pages and support nested hierarchies via `parent_page_id`.

### ✅ Questions & Answers

-   Questions are tied to page templates.
-   Answer options are linked to questions.
-   Supports types: multiple choice, single select, dropdown, and freeform.
-   Questions and answers can be copied.

### ✅ Responses

-   Users respond to questions in **VIEW** mode.
-   Answers (selected or freeform) are saved in bulk on user action.
-   Responses are tied to page instances and specific questions.

### ✅ Navigation

-   A left-hand UI panel shows nested page instances in a tree structure.

## 🧱 Tech Stack

| Layer      | Tech                          |
| ---------- | ----------------------------- |
| Database   | PostgreSQL                    |
| ORM        | Kysely                        |
| API        | Express + tRPC                |
| Validation | Zod                           |
| Frontend   | React + React Query + Zustand |
| Tooling    | Node.js, Yarn/NPM Workspaces  |

## 🛠 Architecture Highlights

-   **Normalized schema** enables deep response analysis.
-   **Shared Zod schemas** power validation across backend and frontend.
-   **Fully typed tRPC hooks** auto-generated for frontend use.
-   **Reusable content structure** through copying templates, questions, and answers.

## 📌 Example Use Case

1. User creates a checklist.
2. Adds a root page (template + instance).
3. Adds nested pages using the parent-child model.
4. Defines questions and answers on the template.
5. In view mode, user responds to questions.
6. Responses are saved in batch.

---

> Built with performance, modularity, and precision in mind.
