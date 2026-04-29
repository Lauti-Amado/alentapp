import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionCard } from './SectionCard';
import { MemoryRouter } from 'react-router';
import { Provider } from './ui/provider';
import { LuUsers } from 'react-icons/lu';

describe('SectionCard', () => {
    // Al utilizar Chakra UI y React Router, debemos envolver (wrap) nuestro 
    // componente con los Providers correspondientes en cada test.
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <MemoryRouter>
                <Provider>
                    {ui}
                </Provider>
            </MemoryRouter>
        );
    };

    it('debe renderizar el título y la descripción correctamente', () => {
        renderWithProviders(
            <SectionCard 
                title="Panel de Socios" 
                description="Descripción de prueba para el test" 
                to="/socios" 
                icon={LuUsers} 
            />
        );

        // Assert: Comprobamos que el DOM contiene exactamente lo que pasamos por Props
        expect(screen.getByText('Panel de Socios')).toBeInTheDocument();
        expect(screen.getByText('Descripción de prueba para el test')).toBeInTheDocument();
        expect(screen.getByText('Ir a la sección')).toBeInTheDocument(); // Texto por defecto de la tarjeta
    });

    it('debe envolver todo en un link que apunte a la ruta correcta', () => {
        renderWithProviders(
            <SectionCard 
                title="Finanzas" 
                description="Pagos y cuotas" 
                to="/finanzas" 
                icon={LuUsers} 
            />
        );

        // Assert: Localizamos el tag <a> y verificamos su href
        const linkElement = screen.getByRole('link');
        expect(linkElement).toHaveAttribute('href', '/finanzas');
    });
});
