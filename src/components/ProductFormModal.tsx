import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  brand: z.string().min(1, "Selecciona una marca"),
  code: z.string().min(1, "El código es requerido").max(100, "Máximo 100 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(255, "Máximo 255 caracteres"),
  price_aereo: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  price_maritimo: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductFormModal({ isOpen, onClose, onSuccess }: ProductFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      brand: "",
      code: "",
      name: "",
      price_aereo: 0,
      price_maritimo: 0,
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      // Check if product with this code already exists
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("code", values.code)
        .maybeSingle();

      if (existing) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({
            brand: values.brand,
            name: values.name,
            price_aereo: values.price_aereo,
            price_maritimo: values.price_maritimo,
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("Producto actualizado correctamente");
      } else {
        // Insert new product
        const { error } = await supabase.from("products").insert({
          brand: values.brand,
          code: values.code,
          name: values.name,
          price_aereo: values.price_aereo,
          price_maritimo: values.price_maritimo,
        });

        if (error) throw error;
        toast.success("Producto agregado correctamente");
      }

      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error al guardar el producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Producto</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar marca" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CLAAS">CLAAS</SelectItem>
                      <SelectItem value="HORSCH">HORSCH</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del producto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_aereo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Aéreo ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_maritimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Marítimo ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
