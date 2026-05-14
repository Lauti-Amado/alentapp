import { createBrowserRouter } from "react-router";

import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { DisciplinesView } from "./views/Disciplines";
import { Lockers } from "./views/Lockers";
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
        path: "lockers",
        Component: Lockers,
      },
      {
        path: "/disciplines",
        Component: DisciplinesView,
      },
    ],
  },
]);
