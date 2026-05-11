import {useState, useEffect } from "react"

const useFetch = (url,options) => {

    const [data,setData] = useState(null)
    const [loading,setLoading] = useState(true)
    const [error,setError] = useState(null)
    
       useEffect(() => {
        const abortContrller = new AbortController()
        const fetchData = async() => {
         try{
               setLoading(true)
               setError(null)
                const response = await fetch(url,{...options, 
                    headers: {
                    "Content-Type": "application/json",
                    },signal:abortContrller.signal})
                if(!response.ok){
                    throw new Error(`Error: ${response.status} ${response.statusText}`)
                }
                const parsedData = await response.json()

                setData(parsedData);
         }catch(err){
              if (err.name !== "AbortError") {
          setError(err.message);
        }
         }finally{
               setLoading(false)
               console.log("Fetch completed")
         }
         return () => {
            abortContrller.abort()
         }
     }

       fetchData()
       },[url])

    

    return { data, loading, error }
}
export default useFetch