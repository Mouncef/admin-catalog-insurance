const getAll = async () => {
    return await localStorage.getItem('offres');
}


export default {
    getAll
}