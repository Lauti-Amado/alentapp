import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { PostgresLockerRepository } from './infrastructure/PostgresLockerRepository.js';
import { PostgresDisciplineRepository } from './infrastructure/PostgresDisciplineRepository.js';
import { PostgresMedicalCertificateRepository } from './infrastructure/PostgresMedicalCertificateRepository.js';
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { PaymentValidator } from './domain/services/PaymentValidator.js';
import { CreateLocker } from './application/CreateLocker.js';
import { GetLockers } from './application/GetLockers.js';
import { UpdateLocker } from './application/UpdateLocker.js';
import { DeleteLocker } from './application/DeleteLocker.js';
import { CreateDisciplineUseCase } from './application/CreateDisciplineUseCase.js';
import { GetDisciplinesUseCase } from './application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from './application/UpdateDisciplineUseCase.js';
import { DeleteDisciplineUseCase } from './application/DeleteDisciplineUseCase.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { GetMemberByDniUseCase } from './application/GetMemberByDniUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { CreateMedicalCertificateUseCase } from './application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from './application/GetMedicalCertificatesUseCase.js';
import { CreatePaymentUseCase } from './application/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from './application/GetPaymentsUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { LockerController } from './delivery/LockerController.js';
import { DisciplineController } from './delivery/DisciplineController.js';
import { MedicalCertificateController } from './delivery/MedicalCertificateController.js';
import { PaymentController } from './delivery/PaymentController.js';

export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development' 
            ? {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                } 
            : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);
    const lockerRepo = new PostgresLockerRepository();
    const disciplineRepo = new PostgresDisciplineRepository();
    const medicalCertificateRepo = new PostgresMedicalCertificateRepository();
    const paymentRepo = new PostgresPaymentRepository();
    const paymentValidator = new PaymentValidator(memberRepo);
    
    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const getMemberByDniUseCase = new GetMemberByDniUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);
    
    const createLockerUseCase = new CreateLocker(lockerRepo);
    const getLockersUseCase = new GetLockers(lockerRepo);
    const updateLockerUseCase = new UpdateLocker(lockerRepo);
    const deleteLockerUseCase = new DeleteLocker(lockerRepo);

    const createDisciplineUseCase = new CreateDisciplineUseCase(disciplineRepo, memberRepo);
    const getDisciplinesUseCase = new GetDisciplinesUseCase(disciplineRepo);
    const updateDisciplineUseCase = new UpdateDisciplineUseCase(disciplineRepo);
    const deleteDisciplineUseCase = new DeleteDisciplineUseCase(disciplineRepo);

    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(medicalCertificateRepo, memberRepo);
    const getMedicalCertificatesUseCase = new GetMedicalCertificatesUseCase(medicalCertificateRepo);

    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, paymentValidator);
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);

    const memberController = new MemberController(
        createMemberUseCase, 
        getMembersUseCase,
        getMemberByDniUseCase,
        updateMemberUseCase,
        deleteMemberUseCase
    );

    const lockerController = new LockerController(
        createLockerUseCase,
        getLockersUseCase,
        updateLockerUseCase,
        deleteLockerUseCase
    );

    const disciplineController = new DisciplineController(
        createDisciplineUseCase,
        getDisciplinesUseCase,
        updateDisciplineUseCase,
        deleteDisciplineUseCase
    );

    const medicalCertificateController = new MedicalCertificateController(
        createMedicalCertificateUseCase,
        getMedicalCertificatesUseCase
    )

    const paymentController = new PaymentController(
        createPaymentUseCase,
        getPaymentsUseCase
    );

    //Miembro
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.get('/api/v1/socios/dni/:dni', memberController.getByDni.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));
    //Locker
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.put('/api/v1/lockers/:id', lockerController.update.bind(lockerController));
    server.delete('/api/v1/lockers/:id', lockerController.delete.bind(lockerController));
    //Discipline
    server.get('/api/v1/disciplines', disciplineController.getAll.bind(disciplineController));
    server.post('/api/v1/disciplines', disciplineController.create.bind(disciplineController));
    server.put('/api/v1/disciplines/:id', disciplineController.update.bind(disciplineController));
    server.delete('/api/v1/disciplines/:id', disciplineController.delete.bind(disciplineController));
    //Medical Certificate
    server.get('/api/v1/medical_certificates', medicalCertificateController.getAll.bind(medicalCertificateController));
    server.post('/api/v1/medical_certificates', medicalCertificateController.create.bind(medicalCertificateController));
    //Payment
    server.get('/api/v1/pagos', paymentController.getAll.bind(paymentController));
    server.post('/api/v1/pagos', paymentController.create.bind(paymentController));

    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' })
    });

    return server;
}

// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`)
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}
