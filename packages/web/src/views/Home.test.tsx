import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeView } from './Home';
import { MemoryRouter } from 'react-router';
import { Provider } from '../components/ui/provider';

describe('HomeView', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <MemoryRouter>
                <Provider>
                    {ui}
                </Provider>
            </MemoryRouter>
        );
    };

    it('debe renderizar el título de bienvenida', () => {
        renderWithProviders(<HomeView />);
        expect(screen.getByText('Bienvenido a Alentapp')).toBeInTheDocument();
    });

    it('debe contener la tarjeta de la sección "Miembros"', () => {
        renderWithProviders(<HomeView />);
        
        // Verifica que la SectionCard de "Miembros" esté presente
        expect(screen.getByText('Miembros')).toBeInTheDocument();
        expect(screen.getByText(/Administra el padrón de socios/i)).toBeInTheDocument();
    });

    it('debe mostrar el placeholder de "Próximamente"', () => {
        renderWithProviders(<HomeView />);
        expect(screen.getByText('Próximamente nuevas secciones')).toBeInTheDocument();
    });
});
