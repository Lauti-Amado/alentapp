import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberValidator } from './MemberValidator.js';
import { MemberRepository } from '../MemberRepository.js';

describe('MemberValidator', () => {
    // Creamos un Mock del repositorio para aislar el test de la Base de Datos
    const mockMemberRepo = {
        findByDni: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new MemberValidator(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateEmail', () => {
        it('debe pasar correctamente si el email es válido', () => {
            expect(() => validator.validateEmail('test@example.com')).not.toThrow();
            expect(() => validator.validateEmail('alguien123@domain.com.ar')).not.toThrow();
        });

        it('debe lanzar un error si el formato del email es inválido', () => {
            expect(() => validator.validateEmail('invalid-email')).toThrow('Formato de correo electrónico inválido');
            expect(() => validator.validateEmail('test@.com')).toThrow('Formato de correo electrónico inválido');
            expect(() => validator.validateEmail('@dominio.com')).toThrow('Formato de correo electrónico inválido');
        });
    });

    describe('isMinor', () => {
        it('debe retornar true si la persona tiene menos de 18 años', () => {
            const today = new Date();
            const birthdate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate()).toISOString();
            expect(validator.isMinor(birthdate)).toBe(true);
        });

        it('debe retornar false si la persona tiene 18 años o más', () => {
            const today = new Date();
            // Restamos 18 años y 1 día para asegurarnos que ya los cumplió
            const birthdate18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate() - 1).toISOString();
            const birthdate30 = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()).toISOString();
            
            expect(validator.isMinor(birthdate18)).toBe(false);
            expect(validator.isMinor(birthdate30)).toBe(false);
        });
    });

    describe('validateDniIsUnique', () => {
        it('debe pasar si el DNI no existe en la base de datos', async () => {
            vi.mocked(mockMemberRepo.findByDni).mockResolvedValueOnce(null);
            
            await expect(validator.validateDniIsUnique('12345678')).resolves.not.toThrow();
            expect(mockMemberRepo.findByDni).toHaveBeenCalledWith('12345678');
        });

        it('debe pasar si el DNI existe pero pertenece al mismo miembro (caso de edición)', async () => {
            vi.mocked(mockMemberRepo.findByDni).mockResolvedValueOnce({ id: 'miembro-1', dni: '12345678' } as any);
            
            await expect(validator.validateDniIsUnique('12345678', 'miembro-1')).resolves.not.toThrow();
        });

        it('debe lanzar error si el DNI existe y pertenece a otro miembro diferente', async () => {
            vi.mocked(mockMemberRepo.findByDni).mockResolvedValueOnce({ id: 'miembro-2', dni: '12345678' } as any);
            
            await expect(validator.validateDniIsUnique('12345678', 'miembro-1')).rejects.toThrow('Ya existe un miembro con ese DNI');
        });
    });
});
