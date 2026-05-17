import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { DisciplinesView } from "./views/Disciplines";
import { Lockers } from "./views/Lockers";
import { MedicalCertificatesView } from "./views/MedicalCertificates";
import { PaymentsView } from "./views/Payments";
import Layout from "./Layout";

export let router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        path: "/",
        Component: HomeView,
      },
      {
        path: "/members",
        Component: MembersView,
      },
      {
        path: "/payments",
        Component: PaymentsView,
      },
      {
        path: "lockers",
        Component: Lockers,
      },
      {
        path: "/disciplines",
        Component: DisciplinesView,
      },
      {
        path: "/medical_certificates",
        Component: MedicalCertificatesView
      }
    ],
  },
]);
