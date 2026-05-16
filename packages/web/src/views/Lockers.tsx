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
import { LuPlus, LuPencil, LuRefreshCw, LuSearch, LuX, LuTrash2 } from "react-icons/lu";
import { useEffect, useState, useMemo } from "react";
import { lockersService } from "../services/lockers";
import { membersService } from "../services/members";
import type { LockerDTO, CreateLockerRequest, UpdateLockerRequest, LockerStatus, MemberDTO } from "@alentapp/shared";
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
import { 
  SelectRoot, 
  SelectTrigger, 
  SelectValueText, 
  SelectContent, 
  SelectItem, 
  createListCollection 
} from "../components/ui/select";

const statusCategories = createListCollection({
  items: [
    { label: "Disponible", value: "Disponible" },
    { label: "Ocupado", value: "Ocupado" },
    { label: "Mantenimiento", value: "Mantenimiento" },
  ],
});

export function Lockers() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingLockerId, setEditingLockerId] = useState<string | null>(null);
  const [originalLocker, setOriginalLocker] = useState<LockerDTO | null>(null);
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<CreateLockerRequest & { estado?: LockerStatus; member_id?: string | null }>({
    numero: 0,
    ubicacion: "",
    member_id: null
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lockersData, membersData] = await Promise.all([
        lockersService.getAll(),
        membersService.getAll()
      ]);
      setLockers(lockersData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return [];
    return members.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.dni.includes(searchTerm)
    ).slice(0, 5);
  }, [searchTerm, members]);

  const openCreateModal = () => {
    setEditingLockerId(null);
    setOriginalLocker(null);
    setFormData({ numero: 0, ubicacion: "", member_id: null });
    setLocalError(null);
    setSearchTerm("");
    setIsDialogOpen(true);
  };

  const openEditModal = (locker: LockerDTO) => {
    setEditingLockerId(locker.id);
    setOriginalLocker(locker);
    setFormData({
      numero: locker.numero,
      ubicacion: locker.ubicacion,
      estado: locker.estado,
      member_id: locker.member_id,
    });
    setLocalError(null);
    setSearchTerm("");
    setIsDialogOpen(true);
  };

  const handleSelectMember = (member: MemberDTO) => {
    if (originalLocker && originalLocker.estado !== 'Disponible') {
      setLocalError("TDD-0011: Solo se pueden asignar lockers que se encuentren previamente en estado 'Disponible'.");
      setSearchTerm("");
      return;
    }
    setFormData(prev => ({ ...prev, member_id: member.id, estado: 'Ocupado' }));
    setSearchTerm("");
    setLocalError(null);
  };

  const handleRemoveMember = () => {
    setFormData(prev => ({ ...prev, member_id: null, estado: 'Disponible' }));
    setLocalError(null);
  };

  const handleDeleteLocker = async (id: string, numero: number, memberId: string | null) => {
    let mensajeConfirmacion = `¿Estás seguro de que deseas eliminar permanentemente el locker #${numero}? Esta acción no se puede deshacer.`;
    
    if (memberId) {
      mensajeConfirmacion = `¡ADVERTENCIA CRÍTICA PARA EL INVENTARIO!\n\n` +
                            `El locker #${numero} se encuentra actualmente ASIGNADO a un socio.\n` +
                            `Si lo eliminás, borrarás permanentemente su registro de alquiler.\n\n` +
                            `¿Estás seguro de que querés proceder con la baja?`;
    }

    if (window.confirm(mensajeConfirmacion)) {
      try {
        await lockersService.delete(id);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Error al eliminar el locker");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);
    try {
      const dataToSubmit = { ...formData, numero: Number(formData.numero) };
      if (editingLockerId) {
        await lockersService.update(editingLockerId, dataToSubmit as UpdateLockerRequest);
      } else {
        await lockersService.create(dataToSubmit as CreateLockerRequest);
      }
      setIsDialogOpen(false);
      fetchData(); 
    } catch (err: any) {
      setLocalError(err.message || "Error interno al procesar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Lockers</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona los casilleros disponibles y sus asignaciones.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Nuevo Locker
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLockerId ? "Editar Locker" : "Registrar Nuevo Locker"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {localError && (
                  <Box p="3" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200" fontSize="sm" fontWeight="medium">
                    {localError}
                  </Box>
                )}
                <Field label="Número de Locker" required>
                  <Input type="number" placeholder="Ej. 101" value={formData.numero || ''} onChange={(e) => setFormData({ ...formData, numero: parseInt(e.target.value) || 0 })} required />
                </Field>
                <Field label="Ubicación" required>
                  <Input type="text" placeholder="Ej. Vestuario Masculino" value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} required />
                </Field>

                {editingLockerId && (
                  <>
                    <Field label="Estado" required>
                      <SelectRoot collection={statusCategories} value={[formData.estado || "Disponible"]} onValueChange={(e) => setFormData({ ...formData, estado: e.value[0] as LockerStatus })} disabled={!!formData.member_id}>
                        <SelectTrigger><SelectValueText placeholder="Seleccione el estado" /></SelectTrigger>
                        <SelectContent>
                          {statusCategories.items.map((stat) => (
                            <SelectItem item={stat} key={stat.value}>{stat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                      {!!formData.member_id && <Text fontSize="xs" color="blue.600" mt="1">El estado está bloqueado en "Ocupado" mientras haya un socio asignado.</Text>}
                    </Field>
                    <Field label="Socio Asignado (Lupa)">
                      {formData.member_id ? (
                        <Flex w="full" p="2" borderWidth="1px" borderRadius="md" align="center" justify="space-between" bg="blue.50" borderColor="blue.200">
                          <Text fontWeight="bold" color="blue.800" fontSize="sm">{members.find(m => m.id === formData.member_id)?.name || "Socio Asignado"}</Text>
                          <Button size="xs" variant="ghost" colorPalette="red" onClick={handleRemoveMember}><LuX /> Remover</Button>
                        </Flex>
                      ) : (
                        <Box position="relative" w="full">
                          <Flex align="center" borderWidth="1px" borderRadius="md" px="3" bg="bg.muted" borderColor="border.subtle">
                            <LuSearch color="gray" />
                            <Input variant="ghost" _focus={{ outline: "none", boxShadow: "none" }} placeholder="Buscar socio por DNI o Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} ml="2" h="10" />
                          </Flex>
                          {searchTerm && (
                            <Box position="absolute" top="100%" left={0} right={0} zIndex={10} bg="bg.panel" boxShadow="lg" borderRadius="md" mt="1" maxH="200px" overflowY="auto" border="1px solid" borderColor="border.subtle">
                              {filteredMembers.length > 0 ? filteredMembers.map(m => (
                                <Box key={m.id} p="3" borderBottom="1px solid" borderColor="border.subtle" _hover={{ bg: "bg.muted/50", cursor: "pointer" }} onClick={() => handleSelectMember(m)}>
                                  <Text fontWeight="bold" fontSize="sm" color="fg.emphasized">{m.name}</Text>
                                  <Text fontSize="xs" color="fg.muted">DNI: {m.dni}</Text>
                                </Box>
                              )) : <Box p="3"><Text fontSize="sm" color="fg.muted">No se encontraron socios.</Text></Box>}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Field>
                  </>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild><Button variant="outline">Cancelar</Button></DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>{editingLockerId ? "Guardar Cambios" : "Crear Locker"}</Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200"><Text fontWeight="bold">Error Crítico:</Text><Text>{error}</Text></Box>}

        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px">
          {isLoading ? (
            <Center h="300px"><Stack align="center" gap="4"><Spinner size="xl" color="blue.500" /><Text color="fg.muted">Cargando datos...</Text></Stack></Center>
          ) : lockers.length === 0 ? (
            <Center h="300px"><Stack align="center" gap="4"><Text color="fg.muted">No se encontraron lockers.</Text><Button variant="ghost" onClick={fetchData}>Reintentar</Button></Stack></Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Número</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Ubicación</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio Asignado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lockers.map((locker) => (
                  <Table.Row key={locker.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">{locker.numero}</Table.Cell>
                    <Table.Cell color="fg.muted">{locker.ubicacion}</Table.Cell>
                    <Table.Cell>
                      <Box display="inline-block" px="2" py="0.5" borderRadius="md" fontSize="xs" fontWeight="bold" bg={locker.estado === 'Disponible' ? 'green.50' : locker.estado === 'Ocupado' ? 'red.50' : 'orange.50'} color={locker.estado === 'Disponible' ? 'green.700' : locker.estado === 'Ocupado' ? 'red.700' : 'orange.700'}>{locker.estado}</Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{locker.member_id ? members.find(m => m.id === locker.member_id)?.name || locker.member_id : "-"}</Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton variant="ghost" size="sm" aria-label="Editar locker" onClick={() => openEditModal(locker)}><LuPencil /></IconButton>
                        <IconButton variant="ghost" size="sm" colorPalette="red" aria-label="Eliminar locker" onClick={() => handleDeleteLocker(locker.id, locker.numero, locker.member_id)}><LuTrash2 /></IconButton>
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
  );
}