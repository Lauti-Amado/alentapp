import { LockerDTO, CreateLockerRequest } from '@alentapp/shared';
import { UpdateLockerRequest } from '../../../shared/index.js';

// Esta interfaz es el "Puerto de Salida". El dominio dice: 
// "No me importa si usás Postgres o Mongo, dame un objeto que cumpla esto".

export interface LockerRepository {
    create(data: CreateLockerRequest): Promise<LockerDTO>;
    findByNumero(numero: number): Promise<LockerDTO | null>;
    findAll(): Promise<LockerDTO[]>;
    findById(id: string): Promise<LockerDTO | null>;
    update(id: string, data: Partial<UpdateLockerRequest>): Promise<LockerDTO>;
}