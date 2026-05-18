import { 
  Table, 
  Button, 
  Heading, 
  HStack, 
  IconButton, 
  Stack, 
  Text, 
  Box,
  Flex,
  Spinner,
  Center,
  Input
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw, LuSearch, LuX } from "react-icons/lu";
import { useEffect, useState, useMemo } from "react";
import { sportsService } from "../services/sports";
import type { SportDTO, CreateSportRequest, UpdateSportRequest } from "@alentapp/shared";
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger,
  DialogCloseTrigger
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

// 👇 Componente para confirmar eliminación
function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  sportName, 
  onConfirm, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  sportName: string; 
  onConfirm: () => void; 
  isLoading: boolean;
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Text>
            ¿Estás seguro de que deseas eliminar el deporte <strong>"{sportName}"</strong>? 
            Esta acción no se puede deshacer.
          </Text>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild disabled={isLoading}>
            <Button variant="outline">Cancelar</Button>
          </DialogActionTrigger>
          <Button 
            colorPalette="red" 
            onClick={onConfirm} 
            loading={isLoading}
          >
            Eliminar
          </Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}

export function SportsView() {
  const [sports, setSports] = useState<SportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for the modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);

  // 👇 Estado para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sportToDelete, setSportToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para capturar los errores de validación del backend por campo
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    Nombre: "",
    Cupo_maximo: 0,
    Precio_adicional: 0,
    Descripcion: "",
    Require_certificado_medico: false,
  });

  const fetchSports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sportsService.getAll();
      setSports(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los deportes");
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 Filtrado de deportes según búsqueda
  const filteredSports = useMemo(() => {
    if (!searchTerm) return sports;
    const term = searchTerm.toLowerCase();
    return sports.filter(sport => 
      sport.Nombre.toLowerCase().includes(term) ||
      sport.Descripcion?.toLowerCase().includes(term) ||
      sport.Cupo_maximo.toString().includes(term)
    );
  }, [sports, searchTerm]);

  const openCreateModal = () => {
    setEditingSportId(null);
    setFormErrors({});
    setFormData({ 
      Nombre: "", 
      Cupo_maximo: 1, 
      Precio_adicional: 0, 
      Descripcion: "", 
      Require_certificado_medico: false 
    });
    setIsDialogOpen(true);
  };

  const openEditModal = (sport: SportDTO) => {
    setEditingSportId(sport.id);
    setFormErrors({});
    setFormData({
      Nombre: sport.Nombre,
      Cupo_maximo: sport.Cupo_maximo,
      Precio_adicional: sport.Precio_adicional,
      Descripcion: sport.Descripcion,
      Require_certificado_medico: sport.Require_certificado_medico,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    
    try {
      if (editingSportId) {
        const updateData: UpdateSportRequest = {
          Cupo_maximo: Number(formData.Cupo_maximo),
          Descripcion: formData.Descripcion,
        } as UpdateSportRequest;
        await sportsService.update(editingSportId, updateData);
      } else {
        const createData: CreateSportRequest = {
          ...formData,
          Cupo_maximo: Number(formData.Cupo_maximo),
          Precio_adicional: Number(formData.Precio_adicional),
        } as CreateSportRequest;
        await sportsService.create(createData);
      }
      
      setIsDialogOpen(false);
      fetchSports(); 
      
      // ✅ Mostrar mensaje de éxito genérico
      setSuccessMessage(editingSportId ? "Deporte actualizado correctamente" : "Deporte creado correctamente");
      
      // ✅ Limpiar formulario
      setFormData({ 
        Nombre: "", 
        Cupo_maximo: 1, 
        Precio_adicional: 0, 
        Descripcion: "", 
        Require_certificado_medico: false 
      });
      
      // ✅ Ocultar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err: any) {
      const errorMessage = (err.response?.data?.error || err.message || "").toLowerCase();
      const errorsMap: Record<string, string> = {};
      const originalMessage = err.response?.data?.error || err.message || "";

      if (errorMessage.includes("nombre") || errorMessage.includes("existe un deporte")) {
        errorsMap.Nombre = originalMessage;
      } else if (errorMessage.includes("cupo")) {
        errorsMap.Cupo_maximo = originalMessage;
      } else if (errorMessage.includes("precio")) {
        errorsMap.Precio_adicional = originalMessage;
      } else if (errorMessage.includes("descripcion") || errorMessage.includes("caracteres")) {
        errorsMap.Descripcion = originalMessage;
      } else {
        alert(originalMessage || "Error al guardar el deporte");
        return;
      }

      setFormErrors(errorsMap);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 👇 Abrir diálogo de confirmación de eliminación
  const openDeleteDialog = (id: string, name: string) => {
    setSportToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  // 👇 Ejecutar la eliminación real tras confirmar
  const handleConfirmDelete = async () => {
    if (!sportToDelete) return;
    
    setIsDeleting(true);
    try {
      await sportsService.delete(sportToDelete.id);
      fetchSports();
      
      // ✅ Mensaje de éxito tras eliminar
      setSuccessMessage(`Deporte "${sportToDelete.name}" eliminado correctamente`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || "Error al eliminar el deporte");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSportToDelete(null);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  return (
    <>
      <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
        <Stack gap="8">
          <Flex justify="space-between" align="center">
            <Stack gap="1">
              <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
              <Text color="fg.muted" fontSize="md">
                Gestiona las disciplinas del club, sus cupos, precios y requerimientos.
              </Text>
            </Stack>
            <HStack gap="3">
              <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
                <LuRefreshCw /> Actualizar
              </Button>
              <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                <LuPlus /> Agregar Deporte
              </Button>
            </HStack>
          </Flex>

          {/* 👇 BUSCADOR (sin contador a la derecha) */}
          <Flex gap="3" mb="4">
            <Flex 
              align="center" 
              borderWidth="1px" 
              borderRadius="md" 
              px="3" 
              bg="bg.muted"
              borderColor="border.subtle"
              flex="1"
              maxW="400px"
            >
              <LuSearch color="gray" />
              <Input
                variant="subtle"
                _focus={{ outline: "none", boxShadow: "none" }}
                placeholder="Buscar deporte por nombre, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ml="2"
                h="10"
              />
              {searchTerm && (
                <IconButton 
                  size="xs" 
                  variant="subtle" 
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                >
                  <LuX />
                </IconButton>
              )}
            </Flex>
          </Flex>

          {/* Modal para agregar/editar deporte */}
          <DialogContent>
            <form onSubmit={handleSubmit} noValidate>
              <DialogHeader>
                <DialogTitle>{editingSportId ? "Editar Deporte" : "Agregar Nuevo Deporte"}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <Stack gap="4">
                  
                  <Field 
                    label="Nombre del Deporte" 
                    required 
                    invalid={!!formErrors.Nombre} 
                    errorText={formErrors.Nombre}
                  >
                    <Input 
                      placeholder="Ej. Fútbol, Natación" 
                      value={formData.Nombre}
                      onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                      required
                      disabled={!!editingSportId} 
                    />
                  </Field>

                  <Field 
                    label="Cupo Máximo" 
                    invalid={!!formErrors.Cupo_maximo} 
                    errorText={formErrors.Cupo_maximo}
                  >
                    <Input 
                      type="number"
                      placeholder="Ej. 30" 
                      value={formData.Cupo_maximo}
                      onChange={(e) => setFormData({ ...formData, Cupo_maximo: Number(e.target.value) })}
                      required
                    />
                  </Field>

                  <Field 
                    label="Precio Adicional ($)" 
                    invalid={!!formErrors.Precio_adicional} 
                    errorText={formErrors.Precio_adicional}
                  >
                    <Input 
                      type="number"
                      placeholder="Ej. 1500" 
                      value={formData.Precio_adicional}
                      onChange={(e) => setFormData({ ...formData, Precio_adicional: Number(e.target.value) })}
                      required
                      disabled={!!editingSportId}
                    />
                  </Field>

                  <Field 
                    label="Descripción" 
                    invalid={!!formErrors.Descripcion} 
                    errorText={formErrors.Descripcion}
                  >
                    <Input 
                      placeholder="Breve descripción de la actividad" 
                      value={formData.Descripcion}
                      onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                    />
                  </Field>

                  <Field label="¿Requiere Certificado Médico?">
                    <HStack gap="3" py="1">
                      <input 
                        type="checkbox"
                        checked={formData.Require_certificado_medico}
                        onChange={(e) => setFormData({ ...formData, Require_certificado_medico: e.target.checked })}
                        disabled={!!editingSportId}
                        style={{ width: "18px", height: "18px", cursor: editingSportId ? "not-allowed" : "pointer" }}
                      />
                      <Text fontSize="sm" color="fg.muted">Marcar si es obligatorio presentar certificado</Text>
                    </HStack>
                  </Field>

                </Stack>
              </DialogBody>
              <DialogFooter>
                <DialogActionTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogActionTrigger>
                <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                  {editingSportId ? "Guardar Cambios" : "Crear Deporte"}
                </Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </form>
          </DialogContent>

          {/* Mensaje de error */}
          {error && (
            <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
              <Text fontWeight="bold">Error:</Text>
              <Text>{error}</Text>
            </Box>
          )}

          {/* ✅ Mensaje de éxito */}
          {successMessage && (
            <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
              <Text fontWeight="bold">Éxito:</Text>
              <Text>{successMessage}</Text>
            </Box>
          )}

          {/* Tabla de deportes */}
          <Box 
            bg="bg.panel" 
            borderRadius="xl" 
            boxShadow="sm" 
            borderWidth="1px" 
            overflow="hidden"
            minH="300px"
            position="relative"
          >
            {isLoading ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Spinner size="xl" color="blue.500" />
                  <Text color="fg.muted">Cargando deportes...</Text>
                </Stack>
              </Center>
            ) : filteredSports.length === 0 ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Text color="fg.muted">
                    {searchTerm 
                      ? "No se encontraron deportes que coincidan con la búsqueda." 
                      : "No se encontraron deportes registrados."}
                  </Text>
                  {searchTerm && (
                    <Button variant="ghost" onClick={() => setSearchTerm("")}>
                      Limpiar búsqueda
                    </Button>
                  )}
                </Stack>
              </Center>
            ) : (
              <Table.Root size="md" variant="line" interactive>
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Cupo Max.</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Precio Adic.</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Certificado</Table.ColumnHeader>
                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {/* 👇 Usar filteredSports en lugar de sports */}
                  {filteredSports.map((sport) => (
                    <Table.Row key={sport.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">
                        {sport.Nombre}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{sport.Cupo_maximo}</Table.Cell>
                      <Table.Cell color="fg.muted">${sport.Precio_adicional}</Table.Cell>
                      <Table.Cell color="fg.muted" maxW="250px" truncate>{sport.Descripcion}</Table.Cell>
                      <Table.Cell>
                        <Box 
                          display="inline-block" 
                          px="2" 
                          py="0.5" 
                          borderRadius="md" 
                          bg={sport.Require_certificado_medico ? 'red.50' : 'green.50'} 
                          color={sport.Require_certificado_medico ? 'red.700' : 'green.700'} 
                          fontSize="xs" 
                          fontWeight="bold"
                        >
                          {sport.Require_certificado_medico ? 'Obligatorio' : 'No requiere'}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <IconButton 
                            variant="ghost" 
                            size="sm" 
                            aria-label="Editar deporte"
                            onClick={() => openEditModal(sport)}
                          >
                            <LuPencil />
                          </IconButton>
                          <IconButton 
                            variant="ghost" 
                            size="sm" 
                            colorPalette="red" 
                            aria-label="Eliminar deporte"
                            onClick={() => openDeleteDialog(sport.id, sport.Nombre)}
                          >
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </Stack>
      </DialogRoot>

      {/* 👇 Diálogo de confirmación de eliminación */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        sportName={sportToDelete?.name || ""}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}