export const getRedirectPath = (user) => {
    if (!user) return '/home';

    if (user.role === 'Admin') return '/dashboard';
    if (user.role === 'Employee') return '/employee/dashboard';
    if (!user.loginOnce) return '/user-preferences';

    return '/home';
};