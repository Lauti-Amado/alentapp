import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO, CreateSportRequest} from '@alentapp/shared';

function cleanText(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remueve todos los tildes/acentos
}

export class CreateSportUseCase {
    constructor(
        private readonly sportRepository: SportRepository,
    ) {}

    async execute(data: CreateSportRequest): Promise<SportDTO> {

        // 1. Validar nombre obligatorio
        if (!data.Nombre || data.Nombre.trim() === '') {
            throw new Error('El nombre del deporte es obligatorio');
        }

        // 2. Validar nombre único
        // 2. Validar nombre único (Insensible a mayúsculas, minúsculas y tildes)
        const allSports = await this.sportRepository.findAll();
        const normalizedInput = cleanText(data.Nombre);
        const isDuplicate = allSports.some(sport => cleanText(sport.Nombre) === normalizedInput);

          if (isDuplicate) {
          throw new Error('Ya existe un deporte con ese nombre');
          }

        // 3. Validar cupos
        if (data.Cupo_maximo <= 0) {
            throw new Error('El formato de cupos máximo debe ser un numero mayor a cero');
        }

        // 4. Validar precio adicional
        if (data.Precio_adicional < 0) {
            throw new Error('El precio adicional debe ser un numero mayor/igual a cero');
        }

        // 5. Validar descripción
        // Si tiene texto (es decir, no es "" y no es undefined), validamos el largo.
        if (data.Descripcion && data.Descripcion.trim() !== '') {
           if (data.Descripcion.length > 255) {
           throw new Error('La descripción no puede superar los 255 caracteres');
        }
    }
        // 6. Persistir
        return this.sportRepository.create(data);
    }

    
}