import { redirect } from "next/navigation";

// The synthetic-gene catalog moved to /shop/synth-genes. Keep this route as a
// permanent redirect so old links / bookmarks don't 404.
export default function SyntheticGenesRedirect() {
  redirect("/shop/synth-genes");
}
