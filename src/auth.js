export function saveToken(t,r,c){sessionStorage.setItem("token",t);sessionStorage.setItem("role",r);sessionStorage.setItem("clinic_id",c??"")}
export function getToken(){return sessionStorage.getItem("token")}
export function getRole(){return sessionStorage.getItem("role")}
export function getClinicId(){return sessionStorage.getItem("clinic_id")}
export function logout(){sessionStorage.clear();window.location.reload()}
