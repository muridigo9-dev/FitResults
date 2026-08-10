
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminIngredients } from "../AdminIngredients";

export default function AdminIngredientsPage() {
    return (
        <AdminLayout title="Ingredientes">
            <AdminIngredients />
        </AdminLayout>
    );
}
