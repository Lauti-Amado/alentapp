import { 
  Table, 
  Button, 
  Heading, 
  HStack, 
  Stack, 
  Text, 
  Box,
  Flex,
  Spinner,
  Center,
  Input
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { sportsService } from "../services/sports";
import type { SportDTO, CreateSportRequest } from "@alentapp/shared";
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

export function SportsView() {
  const [sports, setSports] = useState<SportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para capturar los errores de validación del backend por campo
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    Nombre: "",
    Cupo_maximo: 1,
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

  const openCreateModal = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({}); 
    
    try {
      const createData: CreateSportRequest = {
        ...formData,
        Cupo_maximo: Number(formData.Cupo_maximo),
        Precio_adicional: Number(formData.Precio_adicional),
      };
      
      await sportsService.create(createData);
      setIsDialogOpen(false);
      fetchSports(); 
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

  useEffect(() => {
    fetchSports();
  }, []);

  return (
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

        {/* Modal para agregar deporte */}
        <DialogContent>
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Deporte</DialogTitle>
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
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
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
                Crear Deporte
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

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
          ) : sports.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron deportes registrados.</Text>
                <Button variant="ghost" onClick={fetchSports}>Reintentar</Button>
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
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sports.map((sport) => (
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
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}